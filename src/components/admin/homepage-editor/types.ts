// 编辑器共享类型:resolve 接口返回的数据形状。
import type { PostCardData } from "@/lib/data";
import type { SiteSettings } from "@/lib/site-settings";

export interface ResolvedData {
  site: SiteSettings;
  /** slug → 文章卡数据 */
  posts: Record<string, PostCardData>;
  /** 卡片 id → carousel 数据源解析结果 */
  carousels: Record<string, PostCardData[]>;
  autoFlowPosts: PostCardData[];
  /** 已发布文章清单(post 卡下拉) */
  postOptions: { slug: string; title: string }[];
  /** 已发布文章的全部标签(carousel 标签源下拉) */
  allTags: string[];
}
