"use client";
// 文章编辑器(design/05):CodeMirror 6 全宽写作,Ctrl+Shift+V 在编辑/预览间切换
// (预览走服务端渲染,与发布同一条管线,切换时才请求)+ 图片拖拽/粘贴上传 +
// 元信息表单 + 帮助弹层。Ctrl/Cmd+S 保存。
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeMirror, { EditorView, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { parseImportedMarkdown } from "@/lib/import-md";
import AssetPicker from "@/components/admin/AssetPicker";
import EditorHelp from "./EditorHelp";

export interface EditorInitial {
  id: number;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  contentMd: string;
  tags: string[];
  status: "draft" | "published";
  createdAt: number;
}

/** 标题里的英文数字片段生成 slug;中文标题回退时间串 */
function slugFromTitle(title: string): string {
  const ascii = title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "");
  return ascii || `post-${Date.now().toString(36)}`;
}

const inputCls =
  "card-surface w-full px-3 py-2 text-sm outline-none focus:ring-1";

/** 跟随站点暗色状态(ThemeToggle 切换 html.dark),驱动编辑器主题 */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark;
}

export default function PostEditor({ initial }: { initial?: EditorInitial }) {
  const router = useRouter();
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const isDark = useIsDark();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [md, setMd] = useState(initial?.contentMd ?? "");

  // 导入 .md 带出的原文日期(Unix 秒),保存时写入 created_at
  const [importedDate, setImportedDate] = useState<number | null>(null);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [previewHtml, setPreviewHtml] = useState("");
  const [needsKatex, setNeedsKatex] = useState(false);
  // 上次渲染过的原文:内容未变时切预览直接复用,不重复请求
  const lastRendered = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // 资产选择器:当前为哪个目标打开(封面 / 光标处插图)
  const [pickerFor, setPickerFor] = useState<"cover" | "insert" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);

  // 标题联动 slug(用户手改过则不再联动)
  useEffect(() => {
    if (!slugTouched) setSlug(slugFromTitle(title));
  }, [title, slugTouched]);

  // 整页预览:草稿经 localStorage 交给 /admin/preview/post,按文章页原样渲染,不落库
  const openFullPreview = useCallback(() => {
    const draft = {
      title: title.trim(),
      tags: tagsText.split(/[,,]/).map((s) => s.trim()).filter(Boolean),
      md,
      createdAt: importedDate ?? initial?.createdAt ?? Math.floor(Date.now() / 1000),
    };
    localStorage.setItem("post-full-preview", JSON.stringify(draft));
    // 弹窗被浏览器拦截时给出可见反馈,避免"点了没反应"
    if (!window.open("/admin/preview/post", "_blank")) {
      setMessage("浏览器拦截了预览窗口,请允许本站弹窗后重试");
    }
  }, [title, tagsText, md, importedDate, initial]);

  // 编辑 ⇄ 预览切换(Ctrl+Shift+V):预览与发布同一条管线,切换时才渲染
  const togglePreview = useCallback(async () => {
    if (view === "preview") {
      setView("edit");
      return;
    }
    setView("preview");
    if (lastRendered.current === md) return;
    const res = await fetch("/api/admin/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ md }),
    });
    if (res.ok) {
      const j = await res.json();
      setPreviewHtml(j.html);
      setNeedsKatex(j.needsKatex);
      lastRendered.current = md;
    }
  }, [view, md]);

  // 离开前提示未保存
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const insertAtCursor = useCallback((text: string) => {
    const view = cmRef.current?.view;
    if (!view) {
      setMd((v) => v + text);
      return;
    }
    const { from } = view.state.selection.main;
    view.dispatch({ changes: { from, insert: text }, selection: { anchor: from + text.length } });
    view.focus();
  }, []);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      setUploading(true);
      try {
        for (const file of images) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/admin/assets", { method: "POST", body: fd });
          if (res.ok) {
            const j = await res.json();
            insertAtCursor(`\n![](${j.url})\n`);
          } else {
            const j = await res.json().catch(() => ({}));
            setMessage(j.error ?? "上传失败");
          }
        }
      } finally {
        setUploading(false);
      }
    },
    [insertAtCursor],
  );

  // 导入 .md:frontmatter 回填表单,正文替换;未提供的字段保留现值
  const importMdFile = useCallback(
    async (file: File) => {
      if (
        (md.trim() || title.trim()) &&
        !confirm(`导入「${file.name}」将替换当前标题与正文,继续?`)
      )
        return;
      const p = parseImportedMarkdown(await file.text(), file.name);
      setDirty(true);
      setTitle(p.title);
      if (p.slug) {
        setSlugTouched(true);
        setSlug(p.slug);
      } else if (!initial) {
        setSlugTouched(false); // 新建且无 slug:回到随标题自动生成
      }
      if (p.summary !== null) setSummary(p.summary);
      if (p.coverUrl !== null) setCoverUrl(p.coverUrl);
      if (p.tags !== null) setTagsText(p.tags.join(", "));
      setImportedDate(p.createdAt);
      setMd(p.body);
      setMessage(
        p.createdAt
          ? `已导入 ${file.name}(保留原文日期 ${new Date(p.createdAt * 1000).toISOString().slice(0, 10)})`
          : `已导入 ${file.name}`,
      );
    },
    [md, title, initial],
  );

  async function save(overrideStatus?: "draft" | "published") {
    if (saving) return;
    const nextStatus = overrideStatus ?? status;
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        slug: slug.trim(),
        title: title.trim(),
        summary: summary.trim(),
        coverUrl: coverUrl.trim() || null,
        contentMd: md,
        tags: tagsText
          .split(/[,,]/)
          .map((s) => s.trim())
          .filter(Boolean),
        status: nextStatus,
        ...(importedDate ? { createdAt: importedDate } : {}),
      };
      const res = initial
        ? await fetch(`/api/admin/posts/${initial.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(nextStatus);
        setDirty(false);
        setMessage(nextStatus === "published" ? "已发布" : "已保存");
        if (!initial) router.replace(`/admin/posts/${j.id}`);
      } else {
        setMessage(j.error ?? "保存失败");
      }
    } finally {
      setSaving(false);
    }
  }

  // 快捷键:Ctrl/Cmd+S 保存,Ctrl/Cmd+Shift+V 编辑⇄预览,Esc 从预览回编辑
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      } else if (mod && e.shiftKey && e.key.toLowerCase() === "v") {
        e.preventDefault();
        void togglePreview();
      } else if (e.key === "Escape" && view === "preview" && !pickerFor && !helpOpen) {
        setView("edit");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setDirty(true);
      setter(v);
    };
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 元信息 */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={title}
          onChange={(e) => markDirty(setTitle)(e.target.value)}
          placeholder="标题"
          className={`${inputCls} text-lg font-medium`}
          data-shadow="none"
        />
        <input
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            markDirty(setSlug)(e.target.value);
          }}
          placeholder="slug(URL 标识)"
          className={inputCls}
          data-shadow="none"
        />
        <input
          value={summary}
          onChange={(e) => markDirty(setSummary)(e.target.value)}
          placeholder="摘要(卡片与搜索结果展示)"
          className={`${inputCls} md:col-span-2`}
          data-shadow="none"
        />
        <div className="flex items-center gap-2">
          <input
            value={coverUrl}
            onChange={(e) => markDirty(setCoverUrl)(e.target.value)}
            placeholder="封面图 URL(可从资产库选择)"
            className={inputCls}
            data-shadow="none"
          />
          <button
            type="button"
            onClick={() => setPickerFor("cover")}
            className="shrink-0 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "var(--card-border)" }}
          >
            选择
          </button>
        </div>
        <input
          value={tagsText}
          onChange={(e) => markDirty(setTagsText)(e.target.value)}
          placeholder="标签(逗号分隔)"
          className={inputCls}
          data-shadow="none"
        />
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {saving ? "保存中…" : "保存"}
        </button>
        {status === "draft" ? (
          <button
            type="button"
            onClick={() => save("published")}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
          >
            发布
          </button>
        ) : (
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={saving}
            className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
            style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
          >
            转为草稿
          </button>
        )}
        <button
          type="button"
          onClick={openFullPreview}
          title="新窗口按文章页实际样式渲染当前草稿"
          className="rounded-lg border px-4 py-2 text-sm"
          style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
        >
          整页预览 ↗
        </button>
        <button
          type="button"
          onClick={() => setPickerFor("insert")}
          disabled={view === "preview"}
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40"
          style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
        >
          插入图片
        </button>
        <label
          className="cursor-pointer rounded-lg border px-4 py-2 text-sm"
          style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
        >
          导入 .md
          <input
            type="file"
            accept=".md,.markdown"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importMdFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {uploading ? "图片上传中…" : message}
          {dirty && !saving ? "(未保存)" : ""}
        </span>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          title="写作帮助"
          className="ml-auto rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
        >
          ? 帮助
        </button>
      </div>

      {/* 全宽编辑;Ctrl+Shift+V 切到渲染预览 */}
      <div className="grid min-h-[70vh] grid-cols-1 gap-4">
        <div
          className={`card-surface overflow-hidden ${view === "edit" ? "" : "hidden"}`}
          data-shadow="none"
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length > 0) {
              e.preventDefault();
              void uploadFiles(files);
            }
          }}
          onDrop={(e) => {
            const files = Array.from(e.dataTransfer.files);
            if (files.length === 0) return;
            e.preventDefault();
            // .md 文件走导入,其余按图片上传处理
            const mdFile = files.find((f) => /\.(md|markdown)$/i.test(f.name));
            if (mdFile) {
              void importMdFile(mdFile);
              return;
            }
            void uploadFiles(files);
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <CodeMirror
            ref={cmRef}
            value={md}
            onChange={(v) => {
              setDirty(true);
              setMd(v);
            }}
            height="100%"
            style={{ height: "100%" }}
            theme={isDark ? vscodeDark : vscodeLight}
            extensions={[
              markdown({ base: markdownLanguage, codeLanguages: languages }),
              EditorView.lineWrapping,
            ]}
            basicSetup={{ foldGutter: false, highlightActiveLine: false }}
          />
        </div>
        <div
          className={`card-surface overflow-auto p-5 ${view === "preview" ? "" : "hidden"}`}
          data-shadow="none"
        >
          <p className="mb-4 text-xs" style={{ color: "var(--muted)" }}>
            预览中 · Ctrl+Shift+V 或 Esc 返回编辑
          </p>
          {needsKatex && <link rel="stylesheet" href="/katex/katex.min.css" />}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      {pickerFor && (
        <AssetPicker
          kind="image"
          onClose={() => setPickerFor(null)}
          onSelect={(a) => {
            if (pickerFor === "cover") markDirty(setCoverUrl)(a.url);
            else {
              setDirty(true);
              insertAtCursor(`\n![${a.name.replace(/\.\w+$/, "")}](${a.url})\n`);
            }
            setPickerFor(null);
          }}
        />
      )}

      {helpOpen && <EditorHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
