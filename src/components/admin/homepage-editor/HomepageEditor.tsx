"use client";
// 可视化主页编辑器(design/05):左画布右侧栏,画布与游客端同一套渲染;
// 选中卡片编辑内容与单卡样式,空选编辑全局;保存/预览/启用直连方案 API。
import "./editor.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  homepageConfigSchema,
  type CardConfig,
  type HomepageConfig,
  type LayoutItem,
} from "@/lib/homepage-config";
import ThemeToggle from "@/components/ThemeToggle";
import type { ResolvedData } from "./types";
import Canvas from "./Canvas";
import CardForm, { CARD_DEFAULTS } from "./CardForm";
import GlobalForm from "./GlobalForm";

const accentBtn = "rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60";
const plainBtn = "card-surface px-3 py-1.5 text-sm hover:opacity-80";

export default function HomepageEditor({ configId }: { configId: number }) {
  const router = useRouter();
  const [meta, setMeta] = useState<{ isActive: boolean } | null>(null);
  const [name, setName] = useState("");
  const [config, setConfig] = useState<HomepageConfig | null>(null);
  const [resolved, setResolved] = useState<ResolvedData | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [showDots, setShowDots] = useState(true);

  // 载入方案
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/admin/homepage-configs/${configId}`);
      if (!res.ok) {
        if (!cancelled) setLoadErr("方案不存在");
        return;
      }
      const j = (await res.json()) as { config: { name: string; data: string; isActive: number } };
      if (cancelled) return;
      setMeta({ isActive: j.config.isActive === 1 });
      setName(j.config.name);
      const parsed = homepageConfigSchema.safeParse(JSON.parse(j.config.data));
      setConfig(parsed.success ? parsed.data : DEFAULT_HOMEPAGE_CONFIG);
    })();
    return () => {
      cancelled = true;
    };
  }, [configId]);

  const update = useCallback((fn: (c: HomepageConfig) => HomepageConfig) => {
    setConfig((c) => (c ? fn(c) : c));
    setDirty(true);
  }, []);

  // 画布数据解析:引用内容变化时防抖走 resolve(与游客端同一条数据路径)
  const configRef = useRef(config);
  configRef.current = config;
  const depsKey = useMemo(() => {
    if (!config) return "";
    return JSON.stringify([
      config.layout.items.map((i) =>
        i.card.type === "post" ? i.card.slug : i.card.type === "carousel" ? [i.id, i.card.source] : null,
      ),
      config.layout.autoFlow.unplacedPosts,
    ]);
  }, [config]);
  useEffect(() => {
    if (!depsKey) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await fetch("/api/admin/homepage-configs/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: configRef.current }),
      });
      if (res.ok && !cancelled) setResolved((await res.json()) as ResolvedData);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [depsKey]);

  // 有未保存改动时拦截关页
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function save(): Promise<boolean> {
    if (!config) return false;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/homepage-configs/${configId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, data: config }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMsg(j.error ?? "保存失败");
        return false;
      }
      setDirty(false);
      setMsg(meta?.isActive ? "已保存,线上已生效" : "已保存");
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function preview() {
    if (dirty && !(await save())) return;
    window.open(`/admin/preview/${configId}`, "_blank");
  }

  /** 当前草稿存成新方案并跳去编辑它,原方案保持保存前的样子 */
  async function saveAs() {
    if (!config) return;
    const newName = prompt("另存为方案名:", `${name} 副本`);
    if (!newName?.trim()) return;
    const res = await fetch("/api/admin/homepage-configs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), data: config }),
    });
    const j = (await res.json().catch(() => ({}))) as { id?: number; error?: string };
    if (res.ok && j.id) {
      setDirty(false);
      router.push(`/admin/homepage/edit/${j.id}`);
    } else {
      setMsg(j.error ?? "另存失败");
    }
  }

  async function activate() {
    if (!confirm("启用该方案?线上首页将立即切换。")) return;
    if (dirty && !(await save())) return;
    const res = await fetch(`/api/admin/homepage-configs/${configId}/activate`, { method: "POST" });
    if (res.ok) {
      setMeta({ isActive: true });
      setMsg("已启用");
    } else {
      setMsg("启用失败");
    }
  }

  function addCard(type: CardConfig["type"]) {
    const id = `c-${Date.now().toString(36)}`;
    update((c) => {
      const maxY = c.layout.items.reduce((m, i) => Math.max(m, i.y + i.h), 0);
      return {
        ...c,
        layout: {
          ...c.layout,
          items: [...c.layout.items, { id, x: 0, y: maxY, w: 4, h: 2, card: CARD_DEFAULTS[type] }],
        },
      };
    });
    setSelected(id);
  }

  const selectedItem = config?.layout.items.find((i) => i.id === selected) ?? null;

  function patchItem(patch: Partial<LayoutItem>) {
    const id = selected;
    if (!id) return;
    update((c) => ({
      ...c,
      layout: { ...c.layout, items: c.layout.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) },
    }));
  }

  function deleteItem() {
    const id = selected;
    if (!id) return;
    update((c) => ({
      ...c,
      layout: { ...c.layout, items: c.layout.items.filter((i) => i.id !== id) },
    }));
    setSelected(null);
  }

  if (loadErr) {
    return (
      <p className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
        {loadErr} ·{" "}
        <Link href="/admin/homepage" className="underline underline-offset-4">
          返回方案列表
        </Link>
      </p>
    );
  }
  if (!config) {
    return (
      <p className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
        加载中…
      </p>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
        <Link href="/admin/homepage" className="text-sm hover:opacity-75" style={{ color: "var(--muted)" }}>
          ← 方案列表
        </Link>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          placeholder="方案名"
          className="card-surface w-48 px-3 py-1.5 text-sm outline-none"
          data-shadow="none"
        />
        {meta?.isActive && (
          <span className="rounded px-1.5 py-0.5 text-xs text-white" style={{ background: "var(--accent)" }}>
            启用中
          </span>
        )}
        <select
          value=""
          onChange={(e) => {
            const t = e.target.value as CardConfig["type"] | "";
            if (t) addCard(t);
          }}
          className="card-surface px-2.5 py-1.5 text-sm outline-none"
          data-shadow="none"
        >
          <option value="">+ 添加卡片</option>
          <option value="text">文字卡</option>
          <option value="image">图片卡</option>
          <option value="post">文章卡</option>
          <option value="carousel">轮播卡</option>
          <option value="widget">组件卡(资料/链接)</option>
        </select>
        <button type="button" onClick={() => void save()} disabled={saving} className={accentBtn} style={{ background: "var(--accent)" }}>
          {saving ? "保存中…" : "保存"}
        </button>
        <button type="button" onClick={() => void preview()} className={plainBtn} data-shadow="none">
          预览
        </button>
        <button type="button" onClick={() => void saveAs()} className={plainBtn} data-shadow="none">
          另存为
        </button>
        {meta && !meta.isActive && (
          <button type="button" onClick={() => void activate()} className={plainBtn} data-shadow="none">
            启用
          </button>
        )}
        <span className="text-sm" style={{ color: dirty ? "#d97706" : "var(--muted)" }}>
          {dirty ? "有未保存改动" : msg}
        </span>
        <span className="ml-auto flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={showDots}
              onChange={(e) => setShowDots(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            点阵
          </label>
          切换亮暗预览背景双套取色
          <ThemeToggle />
        </span>
      </div>

      {/* 双栏各自滚动且预留滚动条槽位:切换侧栏面板不再改变画布宽度 */}
      <div className="flex min-h-0 flex-1 items-stretch gap-4">
        <div className="min-w-0 flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
          <Canvas
            config={config}
            resolved={resolved}
            selected={selected}
            showDots={showDots}
            onSelect={setSelected}
            onItemsChange={(items) => update((c) => ({ ...c, layout: { ...c.layout, items } }))}
          />
        </div>
        <aside className="w-80 shrink-0 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
          {selectedItem ? (
            <CardForm
              item={selectedItem}
              resolved={resolved}
              theme={config.theme}
              onPatch={patchItem}
              onDelete={deleteItem}
              onClose={() => setSelected(null)}
            />
          ) : (
            <GlobalForm
              config={config}
              onUpdate={update}
              onReplace={(c) => {
                setConfig(c);
                setDirty(true);
              }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
