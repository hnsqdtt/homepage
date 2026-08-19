"use client";
// 资产库管理页(design/05):文件夹侧栏(单层分类)+ 上传/搜索/移动/删除。
// 分类只是 assets 表的标签,移动/改名不动文件,URL 与既有引用永不变。
import { useCallback, useEffect, useMemo, useState } from "react";
import type { AssetRow } from "@/db/schema";
import { fmtSize } from "@/components/admin/AssetPicker";

const UNFILED = "__unfiled__";
const NEW_FOLDER = "__new__";

interface Refs {
  posts: { id: number; title: string }[];
  configs: { id: number; name: string }[];
  settingKeys: string[];
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [sel, setSel] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");
  // 尚无资产落地的新建文件夹(上传后随 load 落地;刷新即消失)
  const [draftFolders, setDraftFolders] = useState<string[]>([]);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/assets");
    if (res.ok) setAssets((await res.json()).assets);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const folders = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of draftFolders) m.set(f, 0);
    for (const a of assets) if (a.folder) m.set(a.folder, (m.get(a.folder) ?? 0) + 1);
    return [...m.entries()].sort((x, y) => x[0].localeCompare(y[0], "zh"));
  }, [assets, draftFolders]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets.filter((a) => {
      if (sel === UNFILED && a.folder) return false;
      if (sel && sel !== UNFILED && a.folder !== sel) return false;
      if (needle && !a.name.toLowerCase().includes(needle) && !a.url.includes(needle)) return false;
      return true;
    });
  }, [assets, sel, q]);

  async function upload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(fileList)) {
        const fd = new FormData();
        fd.set("file", f);
        if (sel && sel !== UNFILED) fd.set("folder", sel);
        const res = await fetch("/api/admin/assets", { method: "POST", body: fd });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          alert(`${f.name}:${j.error ?? "上传失败"}`);
        }
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function move(url: string, folder: string | null) {
    await fetch("/api/admin/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [url], folder }),
    });
    await load();
  }

  function describeRefs(refs: Refs): string {
    const parts: string[] = [];
    if (refs.posts.length) parts.push(`文章:${refs.posts.map((p) => `《${p.title}》`).join(" ")}`);
    if (refs.configs.length) parts.push(`主页方案:${refs.configs.map((c) => c.name).join("、")}`);
    if (refs.settingKeys.length) parts.push(`站点设置:${refs.settingKeys.join("、")}`);
    return parts.join("\n· ");
  }

  async function remove(a: AssetRow) {
    const res = await fetch(`/api/admin/assets?url=${encodeURIComponent(a.url)}`, { method: "DELETE" });
    if (res.status === 409) {
      const j = await res.json();
      if (
        !confirm(
          `「${a.name}」仍被引用:\n· ${describeRefs(j.refs)}\n\n仍要删除?引用处将变为失效链接。`,
        )
      )
        return;
      await fetch(`/api/admin/assets?url=${encodeURIComponent(a.url)}&force=1`, { method: "DELETE" });
    }
    await load();
  }

  async function confirmRemove(a: AssetRow) {
    if (!confirm(`删除「${a.name}」及其缩略变体?`)) return;
    await remove(a);
  }

  async function renameFolder(from: string) {
    const to = prompt(`重命名文件夹「${from}」为:`, from)?.trim();
    if (!to || to === from) return;
    await fetch("/api/admin/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renameFolder: { from, to } }),
    });
    if (sel === from) setSel(to);
    setDraftFolders((s) => s.map((f) => (f === from ? to : f)));
    await load();
  }

  async function dissolveFolder(from: string) {
    if (!confirm(`解散文件夹「${from}」?其中资产回到未分类,文件与引用不受影响。`)) return;
    await fetch("/api/admin/assets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ renameFolder: { from, to: null } }),
    });
    if (sel === from) setSel("");
    setDraftFolders((s) => s.filter((f) => f !== from));
    await load();
  }

  function newFolder() {
    const name = prompt("新文件夹名称:")?.trim();
    if (!name) return;
    if (!folders.some(([f]) => f === name)) setDraftFolders((s) => [...s, name]);
    setSel(name);
  }

  function copy(url: string) {
    void navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(""), 1500);
  }

  const sideBtn = (active: boolean) =>
    `w-full rounded-lg px-3 py-1.5 text-left text-sm ${active ? "font-medium" : "hover:opacity-75"}`;
  const sideStyle = (active: boolean) =>
    active ? { background: "var(--card-bg)", color: "var(--accent)" } : { color: "var(--muted)" };

  return (
    <div className="flex gap-6">
      <aside className="w-44 shrink-0 space-y-1">
        <button type="button" onClick={() => setSel("")} className={sideBtn(sel === "")} style={sideStyle(sel === "")}>
          全部({assets.length})
        </button>
        <button
          type="button"
          onClick={() => setSel(UNFILED)}
          className={sideBtn(sel === UNFILED)}
          style={sideStyle(sel === UNFILED)}
        >
          未分类({assets.filter((a) => !a.folder).length})
        </button>
        {folders.map(([f, n]) => (
          <div key={f} className="group flex items-center">
            <button
              type="button"
              onClick={() => setSel(f)}
              className={`${sideBtn(sel === f)} min-w-0 flex-1 truncate`}
              style={sideStyle(sel === f)}
            >
              {f}({n})
            </button>
            <span className="hidden shrink-0 gap-1 pr-1 text-xs group-hover:flex" style={{ color: "var(--muted)" }}>
              <button type="button" title="重命名" onClick={() => renameFolder(f)} className="hover:opacity-75">
                ✎
              </button>
              <button type="button" title="解散" onClick={() => dissolveFolder(f)} className="hover:opacity-75">
                ✕
              </button>
            </span>
          </div>
        ))}
        <button type="button" onClick={newFolder} className={sideBtn(false)} style={{ color: "var(--accent)" }}>
          + 新建文件夹
        </button>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold">资产库</h1>
          <label
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ background: "var(--accent)", opacity: busy ? 0.5 : 1 }}
          >
            {busy ? "上传中…" : sel && sel !== UNFILED ? `上传到「${sel}」` : "上传"}
            <input type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索文件名…"
            className="card-surface min-w-0 flex-1 px-3 py-2 text-sm outline-none sm:max-w-60"
            data-shadow="none"
          />
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            支持图片(含 svg)与 css/字体/pdf/json/txt/zip
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((a) => (
            <figure key={a.url} className="card-surface overflow-hidden" data-shadow="none">
              {a.kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.name} className="aspect-video w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex aspect-video w-full flex-col items-center justify-center gap-1">
                  <span className="text-3xl">📄</span>
                  <span className="text-xs uppercase" style={{ color: "var(--muted)" }}>
                    {a.url.split(".").pop()}
                  </span>
                </span>
              )}
              <figcaption className="space-y-1.5 px-3 py-2 text-xs" style={{ color: "var(--muted)" }}>
                <p className="truncate" title={a.name}>
                  {a.name} · {fmtSize(a.size)}
                </p>
                <div className="flex items-center gap-2">
                  <select
                    value={a.folder ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === NEW_FOLDER) {
                        const name = prompt("移动到新文件夹:")?.trim();
                        if (name) void move(a.url, name);
                      } else {
                        void move(a.url, v || null);
                      }
                    }}
                    className="card-surface min-w-0 flex-1 px-1.5 py-1 text-xs outline-none"
                    data-shadow="none"
                  >
                    <option value="">未分类</option>
                    {folders.map(([f]) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                    <option value={NEW_FOLDER}>新建…</option>
                  </select>
                  <button type="button" onClick={() => copy(a.url)} className="shrink-0 hover:opacity-75" style={{ color: "var(--accent)" }}>
                    {copied === a.url ? "已复制" : "复制 URL"}
                  </button>
                  <button type="button" onClick={() => confirmRemove(a)} className="shrink-0 text-red-500 hover:opacity-75">
                    删除
                  </button>
                </div>
              </figcaption>
            </figure>
          ))}
          {shown.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
              {assets.length === 0 ? "还没有资产" : "没有匹配的资产"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
