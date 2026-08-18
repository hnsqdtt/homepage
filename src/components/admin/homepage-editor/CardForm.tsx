"use client";
// 选中卡片的编辑表单:类型与内容 + 单卡样式覆盖(design/09)。
import type { CardConfig, HomepageConfig, LayoutItem, StyleOverride } from "@/lib/homepage-config";
import type { ResolvedData } from "./types";
import {
  AreaField,
  ColorField,
  NumField,
  RangeField,
  Row,
  Section,
  SelectField,
  TextField,
  UploadButton,
  inputCls,
} from "./ui";

/** 新建卡片 / 切换类型时的初始内容 */
export const CARD_DEFAULTS: Record<CardConfig["type"], CardConfig> = {
  text: { type: "text", title: "标题" },
  image: { type: "image", src: "" },
  post: { type: "post", slug: "" },
  carousel: { type: "carousel", source: { kind: "latest", n: 5 }, intervalSec: 6 },
  widget: { type: "widget", widget: "profile" },
};

type Carousel = Extract<CardConfig, { type: "carousel" }>;
type Slide = NonNullable<Carousel["slides"]>[number];

function CarouselFields({
  card,
  setCard,
  allTags,
}: {
  card: Carousel;
  setCard: (c: CardConfig) => void;
  allTags: string[];
}) {
  const mode: "latest" | "tag" | "manual" = card.slides?.length
    ? "manual"
    : (card.source?.kind ?? "latest");
  const slides = card.slides ?? [];

  function setMode(m: typeof mode) {
    if (m === "manual") setCard({ ...card, source: undefined, slides: [{ title: "第一张" }] });
    else if (m === "latest") setCard({ ...card, slides: undefined, source: { kind: "latest", n: 5 } });
    else setCard({ ...card, slides: undefined, source: { kind: "tag", tag: allTags[0] ?? "", n: 5 } });
  }
  function patchSlide(i: number, patch: Partial<Slide>) {
    setCard({ ...card, slides: slides.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  }
  function moveSlide(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setCard({ ...card, slides: next });
  }
  function removeSlide(i: number) {
    const next = slides.filter((_, j) => j !== i);
    // 删空则回到"最新文章"数据源,避免空轮播
    if (next.length === 0) setMode("latest");
    else setCard({ ...card, slides: next });
  }

  return (
    <>
      <Row label="内容">
        <SelectField
          value={mode}
          onChange={setMode}
          options={[
            ["latest", "最新文章"],
            ["tag", "某标签的文章"],
            ["manual", "手动 slides"],
          ] as const}
        />
      </Row>
      {mode === "tag" && card.source?.kind === "tag" && (
        <Row label="标签">
          <select
            value={card.source.tag}
            onChange={(e) => setCard({ ...card, source: { kind: "tag", tag: e.target.value, n: card.source?.n ?? 5 } })}
            className={inputCls}
            data-shadow="none"
          >
            {card.source.tag && !allTags.includes(card.source.tag) && (
              <option value={card.source.tag}>{card.source.tag}(暂无文章)</option>
            )}
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Row>
      )}
      {mode !== "manual" && card.source && (
        <Row label="篇数">
          <NumField
            value={card.source.n}
            min={1}
            max={20}
            onChange={(v) => setCard({ ...card, source: { ...card.source!, n: v } })}
          />
        </Row>
      )}
      {mode === "manual" && (
        <div className="space-y-2.5">
          {slides.map((s, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border p-2.5" style={{ borderColor: "var(--card-border)" }}>
              <div className="flex items-center text-xs" style={{ color: "var(--muted)" }}>
                <span>slide {i + 1}</span>
                <span className="ml-auto flex gap-2">
                  <button type="button" onClick={() => moveSlide(i, -1)} disabled={i === 0} className="disabled:opacity-30">
                    ↑
                  </button>
                  <button type="button" onClick={() => moveSlide(i, 1)} disabled={i === slides.length - 1} className="disabled:opacity-30">
                    ↓
                  </button>
                  <button type="button" onClick={() => removeSlide(i)} className="text-red-500">
                    删除
                  </button>
                </span>
              </div>
              <span className="flex gap-2">
                <TextField value={s.image ?? ""} onChange={(v) => patchSlide(i, { image: v || undefined })} placeholder="图片 /uploads/…(可空)" />
                <UploadButton onDone={(url) => patchSlide(i, { image: url })} />
              </span>
              <TextField value={s.title} onChange={(v) => patchSlide(i, { title: v })} placeholder="标题" />
              <TextField value={s.text ?? ""} onChange={(v) => patchSlide(i, { text: v || undefined })} placeholder="说明(可空)" />
              <TextField value={s.href ?? ""} onChange={(v) => patchSlide(i, { href: v || undefined })} placeholder="链接(可空)" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setCard({ ...card, slides: [...slides, { title: `第${slides.length + 1}张` }] })}
            className="card-surface w-full px-2.5 py-1.5 text-sm hover:opacity-80"
            data-shadow="none"
          >
            + 添加 slide
          </button>
        </div>
      )}
      <Row label="间隔">
        <NumField value={card.intervalSec} min={2} max={60} onChange={(v) => setCard({ ...card, intervalSec: v })} />
      </Row>
    </>
  );
}

/** 样式覆盖行:勾选即覆盖全局,取消恢复跟随 */
function OverrideRow({
  label,
  active,
  onToggle,
  children,
}: {
  label: string;
  active: boolean;
  onToggle: (on: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={active} onChange={(e) => onToggle(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
      <span className="w-14 shrink-0" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span className="min-w-0 flex-1">
        {active ? children : <span className="text-xs" style={{ color: "var(--muted)" }}>跟随全局</span>}
      </span>
    </div>
  );
}

export default function CardForm({
  item,
  resolved,
  theme,
  onPatch,
  onDelete,
  onClose,
}: {
  item: LayoutItem;
  resolved: ResolvedData | null;
  theme: HomepageConfig["theme"];
  onPatch: (patch: Partial<LayoutItem>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const card = item.card;
  const setCard = (c: CardConfig) => onPatch({ card: c });
  const ov = item.styleOverride ?? {};

  function setOv<K extends keyof StyleOverride>(key: K, value: StyleOverride[K] | undefined) {
    const next: StyleOverride = { ...ov };
    if (value === undefined) delete next[key];
    else next[key] = value;
    onPatch({ styleOverride: Object.keys(next).length > 0 ? next : undefined });
  }

  const postOptions = resolved?.postOptions ?? [];

  return (
    <div className="space-y-4">
      <Section title={`卡片 · ${item.w}×${item.h} @ (${item.x}, ${item.y})`}>
        <Row label="类型">
          <SelectField
            value={card.type}
            onChange={(t) => setCard(CARD_DEFAULTS[t])}
            options={[
              ["text", "文字"],
              ["image", "图片"],
              ["post", "文章"],
              ["carousel", "轮播"],
              ["widget", "组件"],
            ] as const}
          />
        </Row>

        {card.type === "text" && (
          <>
            <Row label="标题">
              <TextField value={card.title} onChange={(v) => setCard({ ...card, title: v })} />
            </Row>
            <Row label="正文">
              <AreaField value={card.body ?? ""} onChange={(v) => setCard({ ...card, body: v || undefined })} />
            </Row>
            <Row label="链接">
              <TextField value={card.href ?? ""} onChange={(v) => setCard({ ...card, href: v || undefined })} placeholder="/posts/xxx 或 https://…" />
            </Row>
          </>
        )}

        {card.type === "image" && (
          <>
            <Row label="图片">
              <span className="flex gap-2">
                <TextField value={card.src} onChange={(v) => setCard({ ...card, src: v })} placeholder="/uploads/…" />
                <UploadButton onDone={(url) => setCard({ ...card, src: url })} />
              </span>
            </Row>
            <Row label="压图标题">
              <TextField value={card.title ?? ""} onChange={(v) => setCard({ ...card, title: v || undefined })} />
            </Row>
            <Row label="链接">
              <TextField value={card.href ?? ""} onChange={(v) => setCard({ ...card, href: v || undefined })} placeholder="可空" />
            </Row>
          </>
        )}

        {card.type === "post" && (
          <Row label="文章">
            <select
              value={card.slug}
              onChange={(e) => setCard({ ...card, slug: e.target.value })}
              className={inputCls}
              data-shadow="none"
            >
              <option value="">选择文章…</option>
              {card.slug && !postOptions.some((o) => o.slug === card.slug) && (
                <option value={card.slug}>{card.slug}(不存在或未发布)</option>
              )}
              {postOptions.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.title}
                </option>
              ))}
            </select>
          </Row>
        )}

        {card.type === "carousel" && <CarouselFields card={card} setCard={setCard} allTags={resolved?.allTags ?? []} />}

        {card.type === "widget" && (
          <Row label="组件">
            <SelectField
              value={card.widget}
              onChange={(v) => setCard({ ...card, widget: v })}
              options={[
                ["profile", "个人资料(头像/名字/bio)"],
                ["links", "链接(社交/友链)"],
              ] as const}
            />
          </Row>
        )}
      </Section>

      <Section title="单卡样式覆盖">
        <OverrideRow label="卡面" active={ov.surface !== undefined} onToggle={(on) => setOv("surface", on ? theme.card.surface : undefined)}>
          <SelectField value={ov.surface ?? theme.card.surface} onChange={(v) => setOv("surface", v)} options={[["solid", "实心"], ["glass", "毛玻璃"]] as const} />
        </OverrideRow>
        <OverrideRow label="透明度" active={ov.opacity !== undefined} onToggle={(on) => setOv("opacity", on ? theme.card.opacity : undefined)}>
          <RangeField value={ov.opacity ?? theme.card.opacity} min={0} max={1} step={0.02} onChange={(v) => setOv("opacity", v)} format={(v) => v.toFixed(2)} />
        </OverrideRow>
        <OverrideRow label="模糊" active={ov.blurPx !== undefined} onToggle={(on) => setOv("blurPx", on ? theme.card.blurPx : undefined)}>
          <RangeField value={ov.blurPx ?? theme.card.blurPx} min={0} max={40} onChange={(v) => setOv("blurPx", v)} format={(v) => `${v}px`} />
        </OverrideRow>
        <OverrideRow label="圆角" active={ov.radius !== undefined} onToggle={(on) => setOv("radius", on ? theme.card.radius : undefined)}>
          <RangeField value={ov.radius ?? theme.card.radius} min={0} max={48} onChange={(v) => setOv("radius", v)} format={(v) => `${v}px`} />
        </OverrideRow>
        <OverrideRow label="描边" active={ov.borderWidth !== undefined} onToggle={(on) => setOv("borderWidth", on ? theme.card.borderWidth : undefined)}>
          <RangeField value={ov.borderWidth ?? theme.card.borderWidth} min={0} max={8} onChange={(v) => setOv("borderWidth", v)} format={(v) => `${v}px`} />
        </OverrideRow>
        <OverrideRow label="阴影" active={ov.shadow !== undefined} onToggle={(on) => setOv("shadow", on ? theme.card.shadow : undefined)}>
          <SelectField value={ov.shadow ?? theme.card.shadow} onChange={(v) => setOv("shadow", v)} options={[["none", "无"], ["soft", "柔和"]] as const} />
        </OverrideRow>
        <OverrideRow label="悬停" active={ov.hover !== undefined} onToggle={(on) => setOv("hover", on ? theme.card.hover : undefined)}>
          <SelectField value={ov.hover ?? theme.card.hover} onChange={(v) => setOv("hover", v)} options={[["none", "无"], ["lift", "上浮高亮"]] as const} />
        </OverrideRow>
        <OverrideRow label="标题色" active={ov.titleColor !== undefined} onToggle={(on) => setOv("titleColor", on ? (theme.title.color ?? "#7f77dd") : undefined)}>
          <ColorField value={ov.titleColor ?? theme.title.color ?? "#7f77dd"} onChange={(v) => setOv("titleColor", v)} />
        </OverrideRow>
        <OverrideRow label="标题字号" active={ov.titleSize !== undefined} onToggle={(on) => setOv("titleSize", on ? theme.title.size : undefined)}>
          <RangeField value={ov.titleSize ?? theme.title.size} min={10} max={48} onChange={(v) => setOv("titleSize", v)} format={(v) => `${v}px`} />
        </OverrideRow>
      </Section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            if (confirm("删除这张卡片?")) onDelete();
          }}
          className="card-surface px-3 py-1.5 text-sm text-red-500 hover:opacity-80"
          data-shadow="none"
        >
          删除卡片
        </button>
        <button type="button" onClick={onClose} className="card-surface px-3 py-1.5 text-sm hover:opacity-80" data-shadow="none">
          完成(回全局设置)
        </button>
      </div>
    </div>
  );
}
