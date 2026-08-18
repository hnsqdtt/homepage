// 文章页:ISR 静态化,正文直接输出保存时渲染好的 content_html(design/04)。
// 评论区进入视口才加载;仅含公式的文章加载 KaTeX 样式;含岛屿占位才挂载运行时。
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, posts } from "@/db";
import { eq } from "drizzle-orm";
import { getPublishedBySlug } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { SITE_URL } from "@/lib/env";
import type { TocItem } from "@/lib/markdown";
import IslandMounter from "@/components/islands/IslandMounter";
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

  const toc = JSON.parse(post.toc) as TocItem[];
  const tags = JSON.parse(post.tags) as string[];
  const hasIslands = post.contentHtml.includes("data-island");
  const contentId = "post-content";

  return (
    <>
      {post.needsKatex === 1 && (
        <link rel="stylesheet" href="/katex/katex.min.css" />
      )}
      <div
        className="mx-auto flex w-full max-w-5xl gap-10 px-4 py-6"
      >
        <article className="min-w-0 flex-1">
          <header className="mb-8">
            <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: "var(--muted)" }}>
              <time>{new Date(post.createdAt * 1000).toLocaleDateString("zh-CN")}</time>
              {post.updatedAt !== post.createdAt && (
                <span>更新于 {new Date(post.updatedAt * 1000).toLocaleDateString("zh-CN")}</span>
              )}
              {tags.map((t) => (
                <a
                  key={t}
                  href={`/search?tag=${encodeURIComponent(t)}`}
                  className="rounded-full border px-2 py-0.5 text-xs hover:opacity-75"
                  style={{ borderColor: "var(--card-border)" }}
                >
                  {t}
                </a>
              ))}
            </div>
          </header>

          {/* 移动端折叠目录 */}
          {toc.length > 0 && (
            <details className="card-surface mb-6 p-4 text-sm lg:hidden" data-shadow="none">
              <summary className="cursor-pointer font-medium">目录</summary>
              <TocList toc={toc} className="mt-2" />
            </details>
          )}

          <div
            id={contentId}
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
          {hasIslands && <IslandMounter scopeId={contentId} />}

          <Comments slug={post.slug} />
        </article>

        {/* 桌面端悬浮目录 */}
        {toc.length > 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <nav className="sticky top-8 text-sm">
              <div className="mb-2 font-medium" style={{ color: "var(--muted)" }}>
                目录
              </div>
              <TocList toc={toc} />
            </nav>
          </aside>
        )}
      </div>
    </>
  );
}

function TocList({ toc, className = "" }: { toc: TocItem[]; className?: string }) {
  return (
    <ul className={`space-y-1.5 ${className}`}>
      {toc.map((item) => (
        <li key={item.id} style={{ paddingLeft: (item.depth - 2) * 12 }}>
          <a
            href={`#${item.id}`}
            className="block truncate leading-snug hover:opacity-75"
            style={{ color: "var(--muted)" }}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
