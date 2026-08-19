// 文章视图(design/04):标题区 + 双端目录 + 正文 + 岛屿挂载。纯展示组件,
// 文章页(RSC)与编辑器整页预览(client)共用,保证预览与发布样式永远一致。
import IslandMounter from "@/components/islands/IslandMounter";
import TocNav from "@/components/TocNav";
import type { TocItem } from "@/lib/markdown";

export interface PostArticleData {
  title: string;
  createdAt: number;
  /** 与 createdAt 相同或省略时不显示"更新于" */
  updatedAt?: number;
  tags: string[];
  html: string;
  toc: TocItem[];
  needsKatex: boolean;
}

/** 固定 UTC 展示:服务端(容器时区)与整页预览(浏览器时区)渲染结果一致 */
function fmtDate(unix: number): string {
  return new Date(unix * 1000).toLocaleDateString("zh-CN", { timeZone: "UTC" });
}

export default function PostArticle({
  post,
  children,
}: {
  post: PostArticleData;
  /** 仅正式文章页出现的尾部内容(评论区) */
  children?: React.ReactNode;
}) {
  const hasIslands = post.html.includes("data-island");
  const contentId = "post-content";

  return (
    <>
      {post.needsKatex && <link rel="stylesheet" href="/katex/katex.min.css" />}
      <div className="mx-auto flex w-full max-w-5xl gap-10 px-4 py-6">
        <article className="min-w-0 flex-1">
          <header className="mb-8">
            <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: "var(--muted)" }}>
              <time>{fmtDate(post.createdAt)}</time>
              {post.updatedAt !== undefined && post.updatedAt !== post.createdAt && (
                <span>更新于 {fmtDate(post.updatedAt)}</span>
              )}
              {post.tags.map((t) => (
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
          {post.toc.length > 0 && (
            <details className="card-surface mb-6 p-4 text-sm lg:hidden" data-shadow="none">
              <summary className="cursor-pointer font-medium">目录</summary>
              <TocNav toc={post.toc} className="mt-2" />
            </details>
          )}

          <div
            id={contentId}
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
          {hasIslands && <IslandMounter scopeId={contentId} />}

          {children}
        </article>

        {/* 桌面端悬浮目录 */}
        {post.toc.length > 0 && (
          <aside className="hidden w-56 shrink-0 lg:block">
            <nav className="sticky top-8 text-sm">
              <div className="mb-2 font-medium" style={{ color: "var(--muted)" }}>
                目录
              </div>
              <TocNav toc={post.toc} />
            </nav>
          </aside>
        )}
      </div>
    </>
  );
}
