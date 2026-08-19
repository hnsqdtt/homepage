"use client";
// 全局设置表单:主题 / 背景引擎 / 站头 / 布局 / 高级(customCss + JSON 逃生门)。
// 背景四引擎字段极少,表单手写;新引擎入册时在此补一段(design/09)。
import { useState } from "react";
import { homepageConfigSchema, type HomepageConfig } from "@/lib/homepage-config";
import {
  AreaField,
  CheckField,
  ColorField,
  NumField,
  RangeField,
  Row,
  Section,
  SelectField,
  TextField,
  AssetField,
} from "./ui";

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** 切换引擎时的初始参数(与 backgrounds 注册表的兜底值一致) */
const ENGINE_DEFAULTS: Record<HomepageConfig["background"]["engine"], Record<string, unknown>> = {
  none: {},
  color: { light: "#f6f6f8", dark: "#101014" },
  gradient: {
    light: { from: "#eef1ff", to: "#fdf3f6", angle: 160 },
    dark: { from: "#14141c", to: "#1c1428", angle: 160 },
  },
  image: { url: "", darkUrl: "" },
};

export default function GlobalForm({
  config,
  onUpdate,
  onReplace,
}: {
  config: HomepageConfig;
  onUpdate: (fn: (c: HomepageConfig) => HomepageConfig) => void;
  onReplace: (c: HomepageConfig) => void;
}) {
  const t = config.theme;
  const bg = config.background;
  const h = config.header;
  const p = bg.params;

  const patchTheme = (patch: Partial<HomepageConfig["theme"]>) =>
    onUpdate((c) => ({ ...c, theme: { ...c.theme, ...patch } }));
  const patchCard = (patch: Partial<HomepageConfig["theme"]["card"]>) =>
    onUpdate((c) => ({ ...c, theme: { ...c.theme, card: { ...c.theme.card, ...patch } } }));
  const patchTitle = (patch: Partial<HomepageConfig["theme"]["title"]>) =>
    onUpdate((c) => ({ ...c, theme: { ...c.theme, title: { ...c.theme.title, ...patch } } }));
  const patchBg = (patch: Partial<HomepageConfig["background"]>) =>
    onUpdate((c) => ({ ...c, background: { ...c.background, ...patch } }));
  const setParam = (key: string, v: unknown) =>
    onUpdate((c) => ({ ...c, background: { ...c.background, params: { ...c.background.params, [key]: v } } }));
  const setNested = (group: "light" | "dark", key: string, v: unknown) =>
    onUpdate((c) => {
      const g = obj(c.background.params[group]);
      return {
        ...c,
        background: { ...c.background, params: { ...c.background.params, [group]: { ...g, [key]: v } } },
      };
    });
  const patchHeader = (patch: Partial<HomepageConfig["header"]>) =>
    onUpdate((c) => ({ ...c, header: { ...c.header, ...patch } }));

  // JSON 逃生门
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);
  const [jsonErr, setJsonErr] = useState("");
  function applyJson() {
    try {
      const parsed = homepageConfigSchema.parse(JSON.parse(jsonDraft ?? ""));
      onReplace(parsed);
      setJsonDraft(null);
      setJsonErr("");
    } catch (e) {
      setJsonErr(e instanceof Error ? e.message.slice(0, 400) : "JSON 不合法");
    }
  }

  return (
    <div className="space-y-4">
      <Section title="全局主题">
        <Row label="卡面">
          <SelectField value={t.card.surface} onChange={(v) => patchCard({ surface: v })} options={[["solid", "实心"], ["glass", "毛玻璃"]] as const} />
        </Row>
        <Row label="透明度">
          <RangeField value={t.card.opacity} min={0} max={1} step={0.02} onChange={(v) => patchCard({ opacity: v })} format={(v) => v.toFixed(2)} />
        </Row>
        <Row label="模糊">
          <RangeField value={t.card.blurPx} min={0} max={40} onChange={(v) => patchCard({ blurPx: v })} format={(v) => `${v}px`} />
        </Row>
        <Row label="圆角">
          <RangeField value={t.card.radius} min={0} max={48} onChange={(v) => patchCard({ radius: v })} format={(v) => `${v}px`} />
        </Row>
        <Row label="描边">
          <RangeField value={t.card.borderWidth} min={0} max={8} onChange={(v) => patchCard({ borderWidth: v })} format={(v) => `${v}px`} />
        </Row>
        <Row label="阴影">
          <SelectField value={t.card.shadow} onChange={(v) => patchCard({ shadow: v })} options={[["none", "无"], ["soft", "柔和"]] as const} />
        </Row>
        <Row label="悬停">
          <SelectField
            value={t.card.hover}
            onChange={(v) => patchCard({ hover: v })}
            options={[["none", "无"], ["lift", "上浮高亮(画布不演示,看预览)"]] as const}
          />
        </Row>
        <Row label="标题字号">
          <RangeField value={t.title.size} min={10} max={48} onChange={(v) => patchTitle({ size: v })} format={(v) => `${v}px`} />
        </Row>
        <Row label="标题字重">
          <RangeField value={t.title.weight} min={300} max={900} step={100} onChange={(v) => patchTitle({ weight: v })} />
        </Row>
        <Row label="标题色">
          <span className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={t.title.color !== null}
              onChange={(e) => patchTitle({ color: e.target.checked ? "#7f77dd" : null })}
              style={{ accentColor: "var(--accent)" }}
            />
            {t.title.color !== null ? (
              <ColorField value={t.title.color} onChange={(v) => patchTitle({ color: v })} />
            ) : (
              <span className="text-xs" style={{ color: "var(--muted)" }}>跟随文字色</span>
            )}
          </span>
        </Row>
        <Row label="主色">
          <ColorField value={t.accent} onChange={(v) => patchTheme({ accent: v })} />
        </Row>
        <Row label="页宽">
          <NumField value={t.pageMaxWidth} min={640} max={1920} step={10} onChange={(v) => patchTheme({ pageMaxWidth: v })} />
        </Row>
      </Section>

      {/* id 供画布"点背景"滚动定位 */}
      <Section title="背景" id="editor-bg-section">
        <Row label="引擎">
          <SelectField
            value={bg.engine}
            onChange={(engine) => patchBg({ engine, params: ENGINE_DEFAULTS[engine] })}
            options={[
              ["none", "无(跟随页面底色)"],
              ["color", "纯色"],
              ["gradient", "渐变"],
              ["image", "图片"],
            ] as const}
          />
        </Row>
        {bg.engine === "color" && (
          <>
            <Row label="亮色">
              <ColorField value={str(p.light, "#f6f6f8")} onChange={(v) => setParam("light", v)} />
            </Row>
            <Row label="暗色">
              <ColorField value={str(p.dark, "#101014")} onChange={(v) => setParam("dark", v)} />
            </Row>
          </>
        )}
        {bg.engine === "gradient" &&
          (["light", "dark"] as const).map((g) => {
            const go = obj(p[g]);
            const dFrom = g === "light" ? "#eef1ff" : "#14141c";
            const dTo = g === "light" ? "#fdf3f6" : "#1c1428";
            return (
              <div key={g} className="space-y-2 rounded-lg border p-2.5" style={{ borderColor: "var(--card-border)" }}>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {g === "light" ? "亮色模式" : "暗色模式"}
                </p>
                <Row label="起点色">
                  <ColorField value={str(go.from, dFrom)} onChange={(v) => setNested(g, "from", v)} />
                </Row>
                <Row label="终点色">
                  <ColorField value={str(go.to, dTo)} onChange={(v) => setNested(g, "to", v)} />
                </Row>
                <Row label="角度">
                  <RangeField value={num(go.angle, 160)} min={0} max={360} onChange={(v) => setNested(g, "angle", v)} format={(v) => `${v}°`} />
                </Row>
              </div>
            );
          })}
        {bg.engine === "image" && (
          <>
            <Row label="图片">
              <AssetField value={str(p.url)} onChange={(v) => setParam("url", v)} placeholder="/uploads/…" />
            </Row>
            <Row label="暗色图">
              <AssetField value={str(p.darkUrl)} onChange={(v) => setParam("darkUrl", v)} placeholder="留空共用上图" />
            </Row>
          </>
        )}
        {bg.engine !== "none" && (
          <>
            <Row label="压暗遮罩">
              <RangeField value={bg.dim} min={0} max={0.8} step={0.05} onChange={(v) => patchBg({ dim: v })} format={(v) => v.toFixed(2)} />
            </Row>
            <CheckField label="手机上停用背景" checked={bg.disableOnMobile} onChange={(v) => patchBg({ disableOnMobile: v })} />
          </>
        )}
      </Section>

      <Section title="站头">
        <CheckField label="显示站头" checked={h.show} onChange={(v) => patchHeader({ show: v })} />
        <CheckField label="导航(全部文章)" checked={h.showNav} onChange={(v) => patchHeader({ showNav: v })} />
        <CheckField label="搜索框" checked={h.showSearch} onChange={(v) => patchHeader({ showSearch: v })} />
        <CheckField label="暗色切换按钮" checked={h.showThemeToggle} onChange={(v) => patchHeader({ showThemeToggle: v })} />
      </Section>

      <Section title="布局">
        <Row label="自动续排">
          <SelectField
            value={config.layout.autoFlow.unplacedPosts}
            onChange={(v) =>
              onUpdate((c) => ({ ...c, layout: { ...c.layout, autoFlow: { ...c.layout.autoFlow, unplacedPosts: v } } }))
            }
            options={[
              ["append", "未上墙文章自动排在底部"],
              ["none", "只显示手动布置的卡片"],
            ] as const}
          />
        </Row>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          网格:桌面 {config.layout.cols.desktop} 列 · 平板 {config.layout.cols.tablet} 列 · 手机单列(按位置展开)
        </p>
      </Section>

      <Section title="高级">
        <div>
          <p className="mb-1 text-sm" style={{ color: "var(--muted)" }}>
            自定义 CSS 逃生门:随主页注入;画布不生效,保存后用「预览」查看
          </p>
          <AreaField mono rows={6} value={config.customCss} onChange={(v) => onUpdate((c) => ({ ...c, customCss: v }))} placeholder=".card-wall { … }" />
        </div>
        {jsonDraft === null ? (
          <button
            type="button"
            onClick={() => setJsonDraft(JSON.stringify(config, null, 2))}
            className="card-surface w-full px-2.5 py-1.5 text-sm hover:opacity-80"
            data-shadow="none"
          >
            直接编辑配置 JSON…
          </button>
        ) : (
          <div className="space-y-2">
            <AreaField mono rows={18} value={jsonDraft} onChange={setJsonDraft} />
            {jsonErr && <p className="text-xs break-all text-red-500">{jsonErr}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={applyJson}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                style={{ background: "var(--accent)" }}
              >
                应用到画布
              </button>
              <button
                type="button"
                onClick={() => {
                  setJsonDraft(null);
                  setJsonErr("");
                }}
                className="card-surface px-3 py-1.5 text-sm hover:opacity-80"
                data-shadow="none"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
