"use client";
// 资产选择器(design/05):弹窗内浏览/筛选/搜索资产库,可就地上传(传完即选中)。
// 所有引用图片/文件的表单共用此组件,选中回填 URL。
import { useEffect, useMemo, useState } from "react";
import type { AssetRow } from "@/db/schema";

export function fmtSize(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.round(n / 1024)}KB`;
}

/** 未分类在 select 里的哨兵值(folder 为 NULL) */
const UNFILED = "__unfiled__";

export default function AssetPicker({
  kind,
  onSelect,
  onClose,
}: {
  /** 限定可选类型;不传则全部 */
  kind?: "image" | "file";
  onSelect: (asset: AssetRow) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [folder, setFolder] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/admin/assets")
      .then((r) => r.json())
      .then((j) => setAssets(j.assets ?? []))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const pool = useMemo(
    () => (kind ? assets.filter((a) => a.kind === kind) : assets),
    [assets, kind],
  );

  const folders = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of pool) if (a.folder) m.set(a.folder, (m.get(a.folder) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0], "zh"));
  }, [pool]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return pool.filter((a) => {
      if (folder === UNFILED && a.folder) return false;
      if (folder && folder !== UNFILED && a.folder !== folder) return false;
      if (needle && !a.name.toLowerCase().includes(needle) && !a.url.includes(needle)) return false;
      return true;
    });
  }, [pool, folder, q]);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (folder && folder !== UNFILED) fd.set("folder", folder);
      const res = await fetch("/api/admin/assets", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok) onSelect(j as AssetRow);
      else setError((j as { error?: string }).error ?? "上传失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card-surface flex h-[72vh] w-full max-w-3xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-wrap items-center gap-2 border-b p-3"
          style={{ borderColor: "var(--card-border)" }}
        >
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="card-surface px-2.5 py-1.5 text-sm outline-none"
            data-shadow="none"
          >
            <option value="">全部({pool.length})</option>
            <option value={UNFILED}>未分类({pool.filter((a) => !a.folder).length})</option>
            {folders.map(([f, n]) => (
              <option key={f} value={f}>
                {f}({n})
              </option>
            ))}
          </select>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索文件名…"
            className="card-surface min-w-0 flex-1 px-2.5 py-1.5 text-sm outline-none"
            data-shadow="none"
          />
          <label
            className="shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: "var(--accent)", opacity: busy ? 0.5 : 1 }}
          >
            {busy ? "上传中…" : "上传并选用"}
            <input
              type="file"
              accept={kind === "image" ? "image/*" : undefined}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-2 text-sm hover:opacity-75"
            style={{ color: "var(--muted)" }}
          >
            关闭
          </button>
        </div>

        {error && (
          <p className="px-4 pt-2 text-sm text-red-500">{error}</p>
        )}

        <div className="grid flex-1 auto-rows-min grid-cols-3 gap-3 overflow-auto p-4 sm:grid-cols-4">
          {shown.map((a) => (
            <button
              key={a.url}
              type="button"
              onClick={() => onSelect(a)}
              className="card-surface overflow-hidden text-left hover:opacity-80"
              data-shadow="none"
              title={`${a.name} · ${fmtSize(a.size)}`}
            >
              {a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.name} className="aspect-video w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex aspect-video w-full items-center justify-center text-3xl">
                  📄
                </span>
              )}
              <span
                className="block truncate px-2 py-1.5 text-xs"
                style={{ color: "var(--muted)" }}
              >
                {a.name}
              </span>
            </button>
          ))}
          {loaded && shown.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
              没有匹配的资产
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
