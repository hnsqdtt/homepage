"use client";
// 主页配置方案列表(design/09):新建(复制启用中方案)→ 进可视化编辑器;预览 / 启用 / 删除。
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DEFAULT_HOMEPAGE_CONFIG } from "@/lib/homepage-config";

interface ConfigRow {
  id: number;
  name: string;
  data: string;
  isActive: number;
  updatedAt: number;
}

export default function HomepageConfigPage() {
  const router = useRouter();
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/homepage-configs");
    if (res.ok) setConfigs((await res.json()).configs);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createNew() {
    setBusy(true);
    try {
      // 新方案基于启用中方案复制,便于在现状上迭代;没有则用内置默认
      const active = configs.find((c) => c.isActive === 1);
      const data = active ? JSON.parse(active.data) : DEFAULT_HOMEPAGE_CONFIG;
      const res = await fetch("/api/admin/homepage-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `新方案 ${new Date().toLocaleDateString("zh-CN")}`, data }),
      });
      const j = (await res.json().catch(() => ({}))) as { id?: number; error?: string };
      if (res.ok && j.id) router.push(`/admin/homepage/edit/${j.id}`);
      else alert(j.error ?? "创建失败");
    } finally {
      setBusy(false);
    }
  }

  async function activate(id: number) {
    await fetch(`/api/admin/homepage-configs/${id}/activate`, { method: "POST" });
    await load();
  }

  async function remove(id: number) {
    if (!confirm("删除该方案?")) return;
    const res = await fetch(`/api/admin/homepage-configs/${id}`, { method: "DELETE" });
    if (!res.ok) alert((await res.json().catch(() => ({}))).error ?? "删除失败");
    await load();
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <h1 className="text-xl font-semibold">主页配置方案</h1>
        <button
          type="button"
          onClick={() => void createNew()}
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ background: "var(--accent)" }}
        >
          {busy ? "创建中…" : "新建方案"}
        </button>
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          新方案复制启用中方案;没有启用方案时游客端显示内置默认主页
        </span>
      </div>

      <ul className="space-y-2">
        {configs.map((c) => (
          <li key={c.id} className="card-surface flex flex-wrap items-center gap-3 px-4 py-3 text-sm" data-shadow="none">
            <span className="font-medium">{c.name}</span>
            {c.isActive === 1 && (
              <span className="rounded px-1.5 py-0.5 text-xs text-white" style={{ background: "var(--accent)" }}>
                启用中
              </span>
            )}
            <time className="text-xs" style={{ color: "var(--muted)" }}>
              {new Date(c.updatedAt * 1000).toLocaleString("zh-CN")}
            </time>
            <span className="ml-auto flex gap-3 text-xs">
              <Link href={`/admin/homepage/edit/${c.id}`} className="hover:opacity-75" style={{ color: "var(--accent)" }}>
                编辑
              </Link>
              <a href={`/admin/preview/${c.id}`} target="_blank" className="hover:opacity-75" style={{ color: "var(--accent)" }}>
                预览
              </a>
              {c.isActive !== 1 && (
                <>
                  <button type="button" onClick={() => void activate(c.id)} className="hover:opacity-75" style={{ color: "var(--accent)" }}>
                    启用
                  </button>
                  <button type="button" onClick={() => void remove(c.id)} className="text-red-500 hover:opacity-75">
                    删除
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
        {configs.length === 0 && (
          <li className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            还没有方案,点「新建方案」开始
          </li>
        )}
      </ul>
    </div>
  );
}
