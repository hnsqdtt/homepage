"use client";
// 编辑器画布:react-grid-layout v2 负责拖拽/缩放,卡片内容用游客端同一套组件渲染。
// 不做自动整理(noCompactor + preventCollision):卡片停在配置坐标上,画布与游客端逐格一致。
import { useMemo, useRef, useState } from "react";
import GridLayout, { noCompactor, useContainerWidth, type Layout as RglLayout } from "react-grid-layout";
import type { HomepageConfig, LayoutItem } from "@/lib/homepage-config";
import { overrideVars, surfaceAttrs, themeVars } from "@/components/cards/card-style";
import { PostCard } from "@/components/cards/basic-cards";
import CardContent, { type CardDataSources } from "@/components/cards/CardContent";
import { BackgroundRenderer } from "@/components/backgrounds";
import type { ResolvedData } from "./types";

// 与 globals.css 的 .card-wall 保持同一套网格常数
const ROW_HEIGHT = 96;
const GAP = 16;

// 拖进已占用格子时弹回而不是推开别人:所见坐标即保存坐标
const compactor = { ...noCompactor, preventCollision: true };

export default function Canvas({
  config,
  resolved,
  selected,
  showDots = true,
  onSelect,
  onItemsChange,
}: {
  config: HomepageConfig;
  resolved: ResolvedData | null;
  selected: string | null;
  /** 网格点阵辅助层:difference 混合,在任意背景(含图片)上都可见 */
  showDots?: boolean;
  onSelect: (id: string | null) => void;
  onItemsChange: (items: LayoutItem[]) => void;
}) {
  const items = config.layout.items;
  const { width, mounted, containerRef } = useContainerWidth();
  // 拖拽/缩放期间锁住画布区域最小高度:RGL 容器高度按吸附值实时收缩,比鼠标快,
  // 不锁的话下方续排区会提前上移钻到卡片底下;松手把锁降回 0,min-height 过渡动画平滑落位
  const [lockMinH, setLockMinH] = useState(0);

  const sources: CardDataSources | null = useMemo(() => {
    if (!resolved) return null;
    return {
      site: resolved.site,
      postMap: new Map(Object.entries(resolved.posts)),
      carouselPosts: new Map(Object.entries(resolved.carousels)),
    };
  }, [resolved]);

  const layout: RglLayout = items.map((i) => ({ i: i.id, x: i.x, y: i.y, w: i.w, h: i.h }));

  function lockHeight() {
    setLockMinH(containerRef.current?.offsetHeight ?? 0);
  }

  // 拖拽/缩放松手会紧跟一个 click,标记一次以免被当成"点空白取消选中"
  const justInteracted = useRef(false);

  /** 拖拽/缩放结束:解除高度锁并把最终坐标写回配置 */
  function commit(next: RglLayout) {
    setLockMinH(0);
    justInteracted.current = true;
    const byId = new Map(next.map((g) => [g.i, g]));
    let changed = false;
    const merged = items.map((it) => {
      const g = byId.get(it.id);
      if (!g) return it;
      if (g.x !== it.x || g.y !== it.y || g.w !== it.w || g.h !== it.h) {
        changed = true;
        return { ...it, x: g.x, y: g.y, w: g.w, h: g.h };
      }
      return it;
    });
    if (changed) onItemsChange(merged);
  }

  return (
    <div
      className="relative isolate overflow-hidden rounded-2xl border p-4"
      style={{ ...themeVars(config.theme), borderColor: "var(--card-border)", background: "var(--bg)" }}
      onClick={(e) => {
        if (justInteracted.current) {
          justInteracted.current = false;
          return;
        }
        // 不落在卡片上的点击(含背景图层、空白格)= 回全局设置并定位到背景区
        if ((e.target as HTMLElement).closest(".react-grid-item")) return;
        onSelect(null);
        setTimeout(() => {
          document.getElementById("editor-bg-section")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 50);
      }}
    >
      <BackgroundRenderer background={config.background} fixed={false} />
      <div
        ref={containerRef}
        className="relative mx-auto"
        style={{ maxWidth: config.theme.pageMaxWidth, minHeight: lockMinH, transition: "min-height 220ms ease" }}
      >
        {/* 点阵:落在每个网格单元左上角的格点上,difference 混合保证任意背景下的对比度 */}
        {showDots && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle at 1.5px 1.5px, rgb(255 255 255 / 0.9) 1.3px, transparent 1.8px)",
              backgroundSize: `calc((100% + ${GAP}px) / ${config.layout.cols.desktop}) ${ROW_HEIGHT + GAP}px`,
              mixBlendMode: "difference",
            }}
          />
        )}
        {mounted && (
          <GridLayout
            width={width}
            layout={layout}
            gridConfig={{
              cols: config.layout.cols.desktop,
              rowHeight: ROW_HEIGHT,
              margin: [GAP, GAP],
              containerPadding: [0, 0],
            }}
            compactor={compactor}
            resizeConfig={{ handles: ["n", "s", "e", "w", "ne", "nw", "se", "sw"] }}
            onDragStart={lockHeight}
            onResizeStart={lockHeight}
            onDragStop={commit}
            onResizeStop={commit}
          >
            {items.map((item) => (
              <div
                key={item.id}
                className="card-surface cursor-grab overflow-hidden"
                style={overrideVars(item.styleOverride)}
                {...surfaceAttrs(config.theme, item.styleOverride)}
                onMouseDownCapture={() => onSelect(item.id)}
              >
                {/* 画布内容只看不点:防止误触卡片链接跳走 */}
                <div className="pointer-events-none h-full select-none">
                  {sources ? (
                    <CardContent item={item} sources={sources} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--muted)" }}>
                      加载中…
                    </div>
                  )}
                </div>
                {selected === item.id && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{ borderRadius: "inherit", boxShadow: "inset 0 0 0 2px var(--accent)" }}
                  />
                )}
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      {items.length === 0 && (
        <p className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>
          还没有卡片,用上方"添加卡片"开始
        </p>
      )}

      {/* autoFlow 续排预览:游客端会自动排在卡片墙底部,这里只读展示 */}
      {resolved && config.layout.autoFlow.unplacedPosts === "append" && resolved.autoFlowPosts.length > 0 && (
        <div
          className="mx-auto mt-5 border-t border-dashed pt-4"
          style={{ maxWidth: config.theme.pageMaxWidth, borderColor: "var(--card-border)" }}
        >
          <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
            自动续排 · 未上墙的已发布文章会自动排在下方(共 {resolved.autoFlowPosts.length} 篇,预览前 6 篇;可在「布局」里关闭)
          </p>
          <div className="pointer-events-none grid grid-cols-3 gap-4 opacity-75 select-none">
            {resolved.autoFlowPosts.slice(0, 6).map((p) => (
              <div key={p.slug} className="card-surface h-52 overflow-hidden" {...surfaceAttrs(config.theme)}>
                <PostCard post={p} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
