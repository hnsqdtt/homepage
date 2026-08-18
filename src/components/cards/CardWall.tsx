// 卡片墙:服务端按启用配置渲染 CSS Grid(design/04、09)。
// 三个断点的网格位置在服务端算好写成 CSS 变量;手机单列按 (y,x) 排序展开。
import type { CSSProperties } from "react";
import type { HomepageData } from "@/lib/data";
import type { LayoutItem } from "@/lib/homepage-config";
import { getSiteSettings } from "@/lib/site-settings";
import { overrideVars, surfaceAttrs, themeVars } from "./card-style";
import {
  ImageCard,
  LinksWidget,
  MissingPostCard,
  PostCard,
  ProfileWidget,
  TextCard,
} from "./basic-cards";
import CarouselCard, { type CarouselSlide } from "./CarouselCard";

/** 跨度等比缩放到更窄断点并夹紧(平板走自动流,只需宽度) */
function scaleSpan(w: number, from: number, to: number) {
  return Math.min(to, Math.max(1, Math.round((w * to) / from)));
}

function itemGridVars(item: Pick<LayoutItem, "x" | "y" | "w" | "h">, cols: { desktop: number; tablet: number }): CSSProperties {
  return {
    "--gc-d": `${item.x + 1} / span ${item.w}`,
    "--gr-d": `${item.y + 1} / span ${item.h}`,
    "--w-t": String(scaleSpan(item.w, cols.desktop, cols.tablet)),
    "--h": String(item.h),
    "--ord": String(item.y * 1000 + item.x),
  } as CSSProperties;
}

export default function CardWall({ data }: { data: HomepageData }) {
  const { config, postMap, carouselPosts, autoFlowPosts } = data;
  const site = getSiteSettings();
  const theme = config.theme;
  const cols = config.layout.cols;

  // autoFlow 续排:从已布置区域底部开始,3 卡一行(w=4 h=2)
  const maxY = config.layout.items.reduce((m, i) => Math.max(m, i.y + i.h), 0);
  const autoItems = autoFlowPosts.map((p, i) => ({
    id: `auto-${p.slug}`,
    x: (i % 3) * 4,
    y: maxY + Math.floor(i / 3) * 2,
    w: 4,
    h: 2,
    post: p,
  }));

  function renderCard(item: LayoutItem) {
    const card = item.card;
    switch (card.type) {
      case "text":
        return <TextCard card={card} />;
      case "image":
        return <ImageCard card={card} />;
      case "post": {
        const post = postMap.get(card.slug);
        return post ? <PostCard post={post} /> : <MissingPostCard slug={card.slug} />;
      }
      case "carousel": {
        const fromSource = (carouselPosts.get(item.id) ?? []).map(
          (p): CarouselSlide => ({
            image: p.coverUrl ?? undefined,
            title: p.title,
            text: p.summary,
            href: `/posts/${p.slug}`,
          }),
        );
        const slides = card.slides?.length ? (card.slides as CarouselSlide[]) : fromSource;
        return <CarouselCard slides={slides} intervalSec={card.intervalSec} />;
      }
      case "widget":
        return card.widget === "profile" ? (
          <ProfileWidget site={site} />
        ) : (
          <LinksWidget site={site} />
        );
    }
  }

  return (
    <div className="card-wall mx-auto w-full" style={{ ...themeVars(theme), maxWidth: "var(--page-max-width)" }}>
      {config.layout.items.map((item) => (
        <div
          key={item.id}
          className="wall-item card-surface overflow-hidden"
          style={{ ...itemGridVars(item, cols), ...overrideVars(item.styleOverride) }}
          {...surfaceAttrs(theme, item.styleOverride)}
        >
          {renderCard(item)}
        </div>
      ))}
      {autoItems.map((item) => (
        <div
          key={item.id}
          className="wall-item card-surface overflow-hidden"
          style={itemGridVars(item, cols)}
          {...surfaceAttrs(theme)}
        >
          <PostCard post={item.post} />
        </div>
      ))}
    </div>
  );
}
