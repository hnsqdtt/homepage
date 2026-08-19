// 文章页:ISR 静态化,正文直接输出保存时渲染好的 content_html(design/04)。
// 视图结构在 PostArticle(与编辑器整页预览共用);评论区进入视口才加载。
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, posts } from "@/db";
import { eq } from "drizzle-orm";
import { getPublishedBySlug } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { SITE_URL } from "@/lib/env";
import type { TocItem } from "@/lib/markdown";
import PostArticle from "@/components/PostArticle";
import Comments from "@/components/Comments";

export const revalidate = 3600; // 兜底;保存时主动 revalidatePath
export const dynamicParams = true;

export async function generateStaticParams() {
  // 构建环境是空库,运行时按需生成并缓存
  try {
    return db
      .select({ slug: posts.slug })
      .from(posts)
      .where(eq(posts.status, "published"))
      .all();
  } catch {
    return [];
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPublishedBySlug(slug);
  if (!post) return {};
  const site = getSiteSettings();
  // og:image 用封面图,无封面回退站点头像(design/04)
  const abs = (u: string) => (u.startsWith("http") ? u : `${SITE_URL}${u}`);
  const ogImage = post.coverUrl ? abs(post.coverUrl) : site.avatarUrl ? abs(site.avatarUrl) : undefined;
  return {
    title: `${post.title} · ${site.title}`,
    description: post.summary || undefined,
    openGraph: {
      title: post.title,
      description: post.summary || undefined,
      type: "article",
      url: `${SITE_URL}/posts/${post.slug}`,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPublishedBySlug(slug);
  if (!post) notFound();

  return (
    <PostArticle
      post={{
        title: post.title,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        tags: JSON.parse(post.tags) as string[],
        html: post.contentHtml,
        toc: JSON.parse(post.toc) as TocItem[],
        needsKatex: post.needsKatex === 1,
      }}
    >
      <Comments slug={post.slug} />
    </PostArticle>
  );
}
