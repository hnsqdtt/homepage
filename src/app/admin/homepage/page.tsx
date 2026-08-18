// 主页配置方案管理(design/09)。V1 为 JSON 编辑 + 方案保存/启用/删除;
// 拖拽可视化编辑器在阶段 4 实现(拖拽库选型测试后定)。
"use client";
import { useCallback, useEffect, useState } from "react";

interface ConfigRow {
  id: number;
  name: string;
  data: string;
  isActive: number;
  updatedAt: number;
}

export default function HomepageConfigPage() {
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [editing, setEditing] = useState<ConfigRow | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftJson, setDraftJson] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/homepage-configs");
    if (res.ok) setConfigs((await res.json()).configs);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(c: ConfigRow) {
    setEditing(c);
    setDraftName(c.name);
    setDraftJson(JSON.stringify(JSON.parse(c.data), null, 2));
    setMessage("");
  }

  function startNew() {
    const base = configs.find((c) => c.isActive === 1)?.data;
    setEditing({ id: 0, name: "", data: "", isActive: 0, updatedAt: 0 });
    setDraftName("新方案");
    setDraftJson(
      base
        ? JSON.stringify(JSON.parse(base), null, 2)
        : JSON.stringify(
            {
              layout: {
                cols: { desktop: 12, tablet: 8, mobile: 4 },
                items: [
                  { id: "profile", x: 0, y: 0, w: 4, h: 2, card: { type: "widget", widget: "profile" } },
                ],
                autoFlow: { unplacedPosts: "append", cardType: "post" },
              },
              theme: {
                card: { surface: "solid", opacity: 0.92, blurPx: 12, radius: 16, borderWidth: 1, shadow: "soft" },
                title: { size: 18, weight: 600, color: null },
                accent: "#7F77DD",
                pageMaxWidth: 1200,
              },
              background: { engine: "none", params: {}, dim: 0, disableOnMobile: false },
              searchBox: { position: "top" },
              header: { show: true, showNav: true, showThemeToggle: true },
              customCss: "",
            },
            null,
            2,
          ),
    );
    setMessage("");
  }

  async function saveEditing() {
    if (!editing) return;
    let data: unknown;
    try {
      data = JSON.parse(draftJson);
    } catch {
      setMessage("JSON 语法错误");
      return;
    }
    const isNew = editing.id === 0;
    const res = await fetch(
      isNew ? "/api/admin/homepage-configs" : `/api/admin/homepage-configs/${editing.id}`,
      {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, data }),
      },
    );
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      setMessage("已保存");
      setEditing(null);
      await load();
    } else {
      setMessage(j.error ?? "保存失败");
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
      <div className="mb-5 flex items-center gap-4">
        <h1 className="text-xl font-semibold">主页配置方案</h1>
        <button
          type="button"
          onClick={startNew}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          新建方案
        </button>
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          没有启用方案时游客端显示内置默认主页
        </span>
      </div>

      <ul className="mb-6 space-y-2">
        {configs.map((c) => (
          <li key={c.id} className="card-surface flex items-center gap-3 px-4 py-3 text-sm" data-shadow="none">
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
              <button type="button" onClick={() => startEdit(c)} className="hover:opacity-75" style={{ color: "var(--accent)" }}>
                编辑
              </button>
              {c.isActive !== 1 && (
                <>
                  <button type="button" onClick={() => activate(c.id)} className="hover:opacity-75" style={{ color: "var(--accent)" }}>
                    启用
                  </button>
                  <button type="button" onClick={() => remove(c.id)} className="text-red-500 hover:opacity-75">
                    删除
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
        {configs.length === 0 && (
          <li className="py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
            还没有保存过方案
          </li>
        )}
      </ul>

      {editing && (
        <div className="card-surface p-4" data-shadow="none">
          <div className="mb-3 flex items-center gap-3">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="方案名"
              className="card-surface w-56 px-3 py-2 text-sm outline-none"
              data-shadow="none"
            />
            <button
              type="button"
              onClick={saveEditing}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              保存
            </button>
            <button type="button" onClick={() => setEditing(null)} className="text-sm" style={{ color: "var(--muted)" }}>
              取消
            </button>
            <span className="text-sm" style={{ color: "var(--muted)" }}>
              {message}
            </span>
          </div>
          <textarea
            value={draftJson}
            onChange={(e) => setDraftJson(e.target.value)}
            rows={24}
            spellCheck={false}
            className="card-surface w-full resize-y p-3 font-mono text-xs outline-none"
            data-shadow="none"
          />
          <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
            结构见 design/09:layout.items 每项 x/y/w/h(12 列网格)+ card(text / image / post /
            carousel / widget);theme 全局主题;background 背景引擎(none / color / gradient / image);
            customCss 逃生门。保存时服务端校验。
          </p>
        </div>
      )}
    </div>
  );
}
