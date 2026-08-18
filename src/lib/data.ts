// 游客端读路径的数据访问:批量查询、走索引,不在 JS 层循环大数据集(design/08)。
import { and, desc, eq, inArray, like, notInArray, sql } from "drizzle-orm";
import { db, homepageConfigs, posts, type PostRow } from "@/db";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  homepageConfigSchema,
  type HomepageConfig,
  type LayoutItem,
} from "./homepage-config";

/** 卡片墙展示所需的文章字段子集 */
export type PostCardData = Pick<
  PostRow,
  "slug" | "title" | "summary" | "coverUrl" | "updatedAt" | "tags"
>;

const cardColumns = {
  slug: posts.slug,
  title: posts.title,
  summary: posts.summary,
  coverUrl: posts.coverUrl,
  updatedAt: posts.updatedAt,
  tags: posts.tags,
} as const;

export function getActiveHomepageConfig(): HomepageConfig {
  const row = db
    .select()
    .from(homepageConfigs)
    .where(eq(homepageConfigs.isActive, 1))
    .get();
  if (!row) return DEFAULT_HOMEPAGE_CONFIG;
  try {
    // 写入口已 zod 校验;此处 parse 仅兜底手工改库的情况
    return homepageConfigSchema.parse(JSON.parse(row.data));
  } catch {
    return DEFAULT_HOMEPAGE_CONFIG;
  }
}

export function getPostBySlug(slug: string): PostRow | undefined {
  return db.select().from(posts).where(eq(posts.slug, slug)).get();
}

export function getPublishedBySlug(slug: string): PostRow | undefined {
  return db
    .select()
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .get();
}

export function getPublishedCardsBySlugs(slugs: string[]): PostCardData[] {
  if (slugs.length === 0) return [];
  return db
    .select(cardColumns)
    .from(posts)
    .where(and(eq(posts.status, "published"), inArray(posts.slug, slugs)))
    .all();
}

export function getLatestPublishedCards(n: number, excludeSlugs: string[] = []): PostCardData[] {
  const conds = [eq(posts.status, "published" as const)];
  if (excludeSlugs.length > 0) conds.push(notInArray(posts.slug, excludeSlugs));
  return db
    .select(cardColumns)
    .from(posts)
    .where(and(...conds))
    .orderBy(desc(posts.updatedAt))
    .limit(n)
    .all();
}

export function getPublishedCardsByTag(tag: string, n: number): PostCardData[] {
  // tags 为 JSON 数组文本,LIKE 匹配带引号的完整标签;个人站体量下无需独立标签表
  return db
    .select(cardColumns)
    .from(posts)
    .where(and(eq(posts.status, "published"), like(posts.tags, `%${JSON.stringify(tag)}%`)))
    .orderBy(desc(posts.updatedAt))
    .limit(n)
    .all();
}

/** 全部文章页(/posts)所需元信息:一次取全,筛选排序由客户端就地完成(个人站体量) */
export interface ArchivePost {
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export function getArchiveList(): ArchivePost[] {
  const rows = db
    .select({
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      coverUrl: posts.coverUrl,
      tags: posts.tags,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.createdAt))
    .all();
  // tags 为 JSON 数组文本,这里解析一次(仅元信息、随 ISR 缓存,非逐请求)
  return rows.map((r) => {
    let tags: string[] = [];
    try {
      const parsed = JSON.parse(r.tags);
      if (Array.isArray(parsed)) tags = parsed.filter((t) => typeof t === "string");
    } catch {}
    return { ...r, tags };
  });
}

/** sitemap / RSS 用的全量已发布列表(仅元信息列) */
export function getPublishedMetaList(limit = 1000) {
  return db
    .select({
      slug: posts.slug,
      title: posts.title,
      summary: posts.summary,
      updatedAt: posts.updatedAt,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.updatedAt))
    .limit(limit)
    .all();
}

export function countPublished(): number {
  const r = db
    .select({ c: sql<number>`count(*)` })
    .from(posts)
    .where(eq(posts.status, "published"))
    .get();
  return r?.c ?? 0;
}

// ── 首页组装:一次拿齐渲染所需数据 ──────────────────────────

export interface HomepageData {
  config: HomepageConfig;
  /** slug → 文章卡数据(post 卡与 carousel 引用) */
  postMap: Map<string, PostCardData>;
  /** 卡片 id → carousel 解析出的 slides 数据 */
  carouselPosts: Map<string, PostCardData[]>;
  /** autoFlow 续排的文章 */
  autoFlowPosts: PostCardData[];
}

/** 不传配置时渲染启用中的方案;编辑器 resolve 与方案预览传入任意配置走同一条路径 */
export function buildHomepageData(config: HomepageConfig = getActiveHomepageConfig()): HomepageData {
  const items: LayoutItem[] = config.layout.items;

  const postSlugs = items.flatMap((i) => (i.card.type === "post" ? [i.card.slug] : []));
  const postMap = new Map(getPublishedCardsBySlugs(postSlugs).map((p) => [p.slug, p]));

  const carouselPosts = new Map<string, PostCardData[]>();
  for (const item of items) {
    if (item.card.type !== "carousel" || !item.card.source) continue;
    const src = item.card.source;
    carouselPosts.set(
      item.id,
      src.kind === "latest"
        ? getLatestPublishedCards(src.n)
        : getPublishedCardsByTag(src.tag, src.n),
    );
  }

  const autoFlowPosts =
    config.layout.autoFlow.unplacedPosts === "append"
      ? getLatestPublishedCards(24, postSlugs)
      : [];

  return { config, postMap, carouselPosts, autoFlowPosts };
}
