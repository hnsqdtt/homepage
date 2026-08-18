// Markdown 渲染管线:全部在保存/预览时于服务端执行,游客端零 markdown JS(design/03)。
// 产出 content_html / content_text / toc / needs_katex,一次管线全拿到。
import path from "node:path";
import { unified, type Processor } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { visit, SKIP } from "unist-util-visit";
import { toText } from "hast-util-to-text";
import type { VFile } from "vfile";
import type { Root as MdastRoot } from "mdast";
import type { Root as HastRoot, Element, ElementContent } from "hast";
import { SITE_URL, UPLOADS_DIR } from "./env";
import { islandNames } from "@/components/islands/names";

export interface TocItem {
  depth: number;
  id: string;
  text: string;
}

export interface RenderResult {
  html: string;
  text: string;
  toc: TocItem[];
  needsKatex: boolean;
}

/** 单次渲染的旁路产物,经 vfile.data 传递 */
interface SideData {
  toc?: TocItem[];
  text?: string;
  needsKatex?: boolean;
}

/** ::widget{name="x" a=1} 指令 → 岛屿占位节点,正文其余保持纯静态 HTML */
function remarkWidgetDirective() {
  return (tree: MdastRoot) => {
    visit(tree, (node) => {
      if (
        (node.type === "leafDirective" || node.type === "containerDirective") &&
        node.name === "widget"
      ) {
        const attrs = { ...(node.attributes ?? {}) } as Record<string, string>;
        const name = attrs.name ?? "";
        delete attrs.name;
        const registered = (islandNames as readonly string[]).includes(name);
        node.data = {
          hName: "div",
          hProperties: {
            "data-island": name,
            "data-props": JSON.stringify(attrs),
            // 未注册名字渲染友好占位框,不报错不白屏
            className: registered ? ["island-slot"] : ["island-slot", "island-missing"],
          },
        };
        node.children = [];
      }
    });
  };
}

/** 检测公式节点,决定文章页是否加载 KaTeX 样式 */
function remarkDetectMath() {
  return (tree: MdastRoot, file: VFile) => {
    let found = false;
    visit(tree, (node) => {
      if (node.type === "math" || node.type === "inlineMath") found = true;
    });
    (file.data as SideData).needsKatex = found;
  };
}

/** 提取 TOC(h2-h4,rehype-slug 之后执行)+ 纯文本(供 FTS,KaTeX/Shiki 之前执行) */
function rehypeExtract() {
  return (tree: HastRoot, file: VFile) => {
    const toc: TocItem[] = [];
    visit(tree, "element", (node: Element) => {
      const m = /^h([2-4])$/.exec(node.tagName);
      if (m && node.properties?.id) {
        toc.push({
          depth: Number(m[1]),
          id: String(node.properties.id),
          text: toText(node),
        });
      }
    });
    const data = file.data as SideData;
    data.toc = toc;
    data.text = toText(tree).replace(/\s+/g, " ").trim();
  };
}

/** 外链加 rel/target;图片补 lazy 与宽高占位;title 转 figcaption(design/03) */
function rehypeEnhance() {
  return async (tree: HastRoot) => {
    const localImgs: Element[] = [];

    visit(tree, "element", (node: Element, index, parent) => {
      if (node.tagName === "a" && typeof node.properties?.href === "string") {
        const href = node.properties.href;
        if (/^https?:\/\//.test(href) && !href.startsWith(SITE_URL)) {
          node.properties.target = "_blank";
          node.properties.rel = ["noopener"];
        }
      }

      if (node.tagName === "img") {
        node.properties = {
          ...node.properties,
          loading: "lazy",
          decoding: "async",
        };
        const src = node.properties.src;
        if (typeof src === "string" && src.startsWith("/uploads/")) {
          localImgs.push(node);
        }
        // ![alt](url "说明") 的说明渲染为 figcaption:仅当 img 独占一个段落
        const title = node.properties.title;
        if (
          typeof title === "string" &&
          title &&
          parent &&
          parent.type === "element" &&
          parent.tagName === "p" &&
          parent.children.filter((c: ElementContent) => c.type !== "text" || c.value.trim() !== "").length === 1
        ) {
          delete node.properties.title;
          const figure: Element = {
            type: "element",
            tagName: "figure",
            properties: {},
            children: [
              { ...node },
              {
                type: "element",
                tagName: "figcaption",
                properties: {},
                children: [{ type: "text", value: title }],
              },
            ] as ElementContent[],
          };
          parent.tagName = "figure";
          parent.properties = {};
          parent.children = figure.children;
          return SKIP;
        }
      }
    });

    // 本地图片读取实际尺寸,写 width/height 防布局抖动
    if (localImgs.length > 0) {
      const sharp = (await import("sharp")).default;
      await Promise.all(
        localImgs.map(async (node) => {
          try {
            const rel = String(node.properties!.src).slice("/uploads/".length);
            const abs = path.join(UPLOADS_DIR, path.normalize(rel));
            if (!abs.startsWith(UPLOADS_DIR)) return;
            const meta = await sharp(abs).metadata();
            if (meta.width && meta.height) {
              node.properties!.width = meta.width;
              node.properties!.height = meta.height;
            }
          } catch {
            // 文件不存在等情况静默跳过,渲染不因此失败
          }
        }),
      );
    }
  };
}

let processor: Processor | undefined;

function getProcessor() {
  if (processor) return processor;
  processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDirective)
    .use(remarkWidgetDirective)
    .use(remarkDetectMath)
    // 站主是唯一作者,允许内嵌原始 HTML(自己对自己免防)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeExtract)
    .use(rehypeKatex)
    .use(rehypeShiki, {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: "light",
    })
    .use(rehypeEnhance)
    .use(rehypeStringify, { allowDangerousHtml: true }) as unknown as Processor;
  return processor;
}

export async function renderMarkdown(md: string): Promise<RenderResult> {
  const file = await getProcessor().process(md);
  const data = file.data as SideData;
  return {
    html: String(file.value),
    text: data.text ?? "",
    toc: data.toc ?? [],
    needsKatex: data.needsKatex ?? false,
  };
}
