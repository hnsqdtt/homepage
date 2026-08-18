// 图库:浏览/上传/复制 URL/删除(design/05)。
"use client";
import { useCallback, useEffect, useState } from "react";

interface Entry {
  url: string;
  size: number;
  mtime: number;
}

function fmtSize(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`;
}

export default function UploadsPage() {
  const [files, setFiles] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/uploads");
    if (res.ok) setFiles((await res.json()).files);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(fileList)) {
        const fd = new FormData();
        fd.append("file", f);
        await fetch("/api/admin/upload", { method: "POST", body: fd });
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(url: string) {
    if (!confirm("删除该图片及其缩略变体?文章里的引用会失效。")) return;
    await fetch(`/api/admin/uploads?url=${encodeURIComponent(url)}`, { method: "DELETE" });
    await load();
  }

  function copy(url: string) {
    void navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(""), 1500);
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <h1 className="text-xl font-semibold">图库({files.length})</h1>
        <label
          className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--accent)", opacity: busy ? 0.5 : 1 }}
        >
          {busy ? "上传中…" : "上传图片"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {files.map((f) => (
          <figure key={f.url} className="card-surface overflow-hidden" data-shadow="none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="aspect-video w-full object-cover" loading="lazy" />
            <figcaption className="flex items-center gap-2 px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>
              <span>{fmtSize(f.size)}</span>
              <button type="button" onClick={() => copy(f.url)} className="ml-auto hover:opacity-75" style={{ color: "var(--accent)" }}>
                {copied === f.url ? "已复制" : "复制 URL"}
              </button>
              <button type="button" onClick={() => remove(f.url)} className="text-red-500 hover:opacity-75">
                删除
              </button>
            </figcaption>
          </figure>
        ))}
        {files.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
            还没有图片
          </p>
        )}
      </div>
    </div>
  );
}
