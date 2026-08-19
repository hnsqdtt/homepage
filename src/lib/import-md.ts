// .md 导入解析(design/05):frontmatter 与 lib/export.ts 的导出格式互逆,
// 同时兼容常见手写格式(裸文本值、YAML 块列表 tags)。纯函数,前端直接调用。

export interface ImportedPost {
  title: string;
  /** frontmatter 中的合法 slug;缺失或不合法为 null(由调用方决定回退策略) */
  slug: string | null;
  /** null 表示 frontmatter 未提供该字段,调用方保留现值 */
  summary: string | null;
  coverUrl: string | null;
  tags: string[] | null;
  /** frontmatter date 解析出的原文日期(Unix 秒),保存时写入 created_at */
  createdAt: number | null;
  body: string;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/** 逐行解析 frontmatter:值优先 JSON.parse(导出格式),失败取裸文本;支持块列表 */
function parseFrontmatter(src: string): { meta: Record<string, unknown>; body: string } {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { meta: {}, body: src };

  const meta: Record<string, unknown> = {};
  const lines = m[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s/.test(line)) continue; // 缩进行由块列表分支消费
    const sep = line.indexOf(":");
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const rawVal = line.slice(sep + 1).trim();
    if (!key) continue;

    if (!rawVal) {
      // YAML 块列表:key: 后跟缩进的 "- item" 行
      const items: string[] = [];
      while (i + 1 < lines.length) {
        const item = lines[i + 1].match(/^\s+-\s+(.*)$/);
        if (!item) break;
        items.push(stripQuotes(item[1].trim()));
        i++;
      }
      if (items.length > 0) meta[key] = items;
      continue;
    }
    try {
      meta[key] = JSON.parse(rawVal);
    } catch {
      meta[key] = stripQuotes(rawVal);
    }
  }
  return { meta, body: src.slice(m[0].length) };
}

function stripQuotes(s: string): string {
  return /^(['"]).*\1$/.test(s) ? s.slice(1, -1) : s;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function parseImportedMarkdown(raw: string, fileName: string): ImportedPost {
  const { meta, body } = parseFrontmatter(raw.replaceAll("\r\n", "\n"));

  // 标题:frontmatter > 正文开头的 H1(取出后从正文移除,避免与页面标题重复)> 文件名
  let title = asString(meta.title);
  let content = body.replace(/^\n+/, "");
  if (!title) {
    const h1 = content.match(/^#\s+(.+?)\s*\n+/);
    if (h1) {
      title = h1[1].trim();
      content = content.slice(h1[0].length);
    } else {
      title = fileName.replace(/\.(md|markdown)$/i, "").trim() || "未命名";
    }
  }

  // date:导出格式为 ISO 字符串;手写的 2024-03-15 等 Date 可解析的形式均接受
  const rawDate = asString(meta.date);
  const parsedDate = rawDate ? new Date(rawDate) : null;
  const createdAt =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? Math.floor(parsedDate.getTime() / 1000)
      : null;

  const rawSlug = asString(meta.slug);
  const rawTags = meta.tags;
  const tags = Array.isArray(rawTags)
    ? rawTags.map((t) => String(t).trim()).filter(Boolean)
    : typeof rawTags === "string"
      ? rawTags.split(/[,,]/).map((t) => t.trim()).filter(Boolean)
      : null;

  return {
    title,
    slug: rawSlug && SLUG_RE.test(rawSlug) ? rawSlug : null,
    summary: asString(meta.summary),
    coverUrl: asString(meta.cover) ?? asString(meta.coverUrl),
    tags,
    createdAt,
    body: content,
  };
}
