// 单卡内容渲染:游客端 CardWall 与管理台编辑器画布共用(design/05 所见即所得)。
// 保持客户端可用:只依赖类型与纯组件,数据一律由调用方传入。
import type { LayoutItem } from "@/lib/homepage-config";
import type { PostCardData } from "@/lib/data";
import type { SiteSettings } from "@/lib/site-settings";
import {
  ImageCard,
  LinksWidget,
  MissingPostCard,
  PostCard,
  ProfileWidget,
  TextCard,
} from "./basic-cards";
import CarouselCard, { type CarouselSlide } from "./CarouselCard";

/** 卡片渲染所需的外部数据:游客端由 buildHomepageData 提供,编辑器由 resolve 接口提供 */
export interface CardDataSources {
  site: SiteSettings;
  postMap: Map<string, PostCardData>;
  carouselPosts: Map<string, PostCardData[]>;
}

function postToSlide(p: PostCardData): CarouselSlide {
  return {
    image: p.coverUrl ?? undefined,
    title: p.title,
    text: p.summary,
    href: `/posts/${p.slug}`,
  };
}

export default function CardContent({
  item,
  sources,
}: {
  item: LayoutItem;
  sources: CardDataSources;
}) {
  const card = item.card;
  switch (card.type) {
    case "text":
      return <TextCard card={card} />;
    case "image":
      return <ImageCard card={card} />;
    case "post": {
      const post = sources.postMap.get(card.slug);
      return post ? <PostCard post={post} /> : <MissingPostCard slug={card.slug} />;
    }
    case "carousel": {
      const fromSource = (sources.carouselPosts.get(item.id) ?? []).map(postToSlide);
      const slides = card.slides?.length ? (card.slides as CarouselSlide[]) : fromSource;
      return <CarouselCard slides={slides} intervalSec={card.intervalSec} />;
    }
    case "widget":
      return card.widget === "profile" ? (
        <ProfileWidget site={sources.site} />
      ) : (
        <LinksWidget site={sources.site} />
      );
  }
}
