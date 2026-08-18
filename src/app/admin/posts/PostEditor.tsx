"use client";
// 文章编辑器(design/05):CodeMirror 6 + 分屏预览(服务端渲染,与发布同一条管线,
// debounce)+ 图片拖拽/粘贴上传 + 元信息表单。Ctrl/Cmd+S 保存。
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import CodeMirror, { EditorView, type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";

export interface EditorInitial {
  id: number;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  contentMd: string;
  tags: string[];
  status: "draft" | "published";
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

export default function PostEditor({ initial }: { initial?: EditorInitial }) {
  const router = useRouter();
  const cmRef = useRef<ReactCodeMirrorRef>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial);
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverUrl ?? "");
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [status, setStatus] = useState<"draft" | "published">(initial?.status ?? "draft");
  const [md, setMd] = useState(initial?.contentMd ?? "");

  const [previewHtml, setPreviewHtml] = useState("");
  const [needsKatex, setNeedsKatex] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);

  // 标题联动 slug(用户手改过则不再联动)
  useEffect(() => {
    if (!slugTouched) setSlug(slugFromTitle(title));
  }, [title, slugTouched]);

  // 分屏预览:与发布同一条管线,600ms debounce
  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ md }),
      });
      if (res.ok) {
        const j = await res.json();
        setPreviewHtml(j.html);
        setNeedsKatex(j.needsKatex);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [md]);

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
          const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
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

  // Ctrl/Cmd+S 保存
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        void save();
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
            placeholder="封面图 URL(可从图库复制)"
            className={inputCls}
            data-shadow="none"
          />
          <label className="shrink-0 cursor-pointer rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--card-border)" }}>
            上传
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData();
                fd.append("file", f);
                const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
                if (res.ok) markDirty(setCoverUrl)((await res.json()).url);
                e.target.value = "";
              }}
            />
          </label>
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
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {uploading ? "图片上传中…" : message}
          {dirty && !saving ? "(未保存)" : ""}
        </span>
        <span className="ml-auto text-xs" style={{ color: "var(--muted)" }}>
          拖入/粘贴图片自动上传 · Ctrl+S 保存
        </span>
      </div>

      {/* 分屏:编辑 + 预览 */}
      <div className="grid min-h-[60vh] grid-cols-1 gap-4 lg:grid-cols-2">
        <div
          className="card-surface overflow-hidden"
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
            if (files.length > 0) {
              e.preventDefault();
              void uploadFiles(files);
            }
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
            extensions={[
              markdown({ base: markdownLanguage, codeLanguages: languages }),
              EditorView.lineWrapping,
            ]}
            basicSetup={{ foldGutter: false, highlightActiveLine: false }}
          />
        </div>
        <div className="card-surface overflow-auto p-5" data-shadow="none">
          {needsKatex && <link rel="stylesheet" href="/katex/katex.min.css" />}
          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  );
}
