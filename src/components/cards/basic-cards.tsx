// 静态卡片(服务端渲染,零 JS):text / image / post / widget(profile、links)。
import Link from "next/link";
import type { CardConfig } from "@/lib/homepage-config";
import type { PostCardData } from "@/lib/data";
import type { SiteSettings } from "@/lib/site-settings";

function CardLink({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  if (!href) return <>{children}</>;
  const external = /^https?:\/\//.test(href);
  return external ? (
    <a href={href} target="_blank" rel="noopener" className="block h-full">
      {children}
    </a>
  ) : (
    <Link href={href} className="block h-full">
      {children}
    </Link>
  );
}

export function TextCard({
  card,
}: {
  card: Extract<CardConfig, { type: "text" }>;
}) {
  return (
    <CardLink href={card.href}>
      <div className="flex h-full flex-col gap-2 p-5">
        <h3 className="card-title">{card.title}</h3>
        {card.body && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {card.body}
          </p>
        )}
      </div>
    </CardLink>
  );
}

export function ImageCard({
  card,
}: {
  card: Extract<CardConfig, { type: "image" }>;
}) {
  if (!card.src) {
    return (
      <div className="flex h-full items-center justify-center p-5 text-sm" style={{ color: "var(--muted)" }}>
        图片卡:尚未设置图片
      </div>
    );
  }
  return (
    <CardLink href={card.href}>
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: "inherit" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.src} alt={card.title ?? ""} className="h-full w-full object-cover" loading="lazy" />
        {card.title && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10">
            <h3 className="card-title !text-white">{card.title}</h3>
          </div>
        )}
      </div>
    </CardLink>
  );
}

/** 只依赖展示字段,/posts 卡片视图等处可用任意含这些字段的对象复用 */
export function PostCard({
  post,
}: {
  post: Pick<PostCardData, "slug" | "title" | "summary" | "coverUrl" | "updatedAt">;
}) {
  return (
    <Link href={`/posts/${post.slug}`} className="block h-full">
      <div className="flex h-full flex-col overflow-hidden" style={{ borderRadius: "inherit" }}>
        {post.coverUrl && (
          <div className="min-h-0 flex-1 basis-1/2 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="flex flex-col gap-1.5 p-5">
          <h3 className="card-title line-clamp-2">{post.title}</h3>
          {post.summary && (
            <p className="line-clamp-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
              {post.summary}
            </p>
          )}
          <time className="mt-auto pt-1 text-xs" style={{ color: "var(--muted)" }}>
            {new Date(post.updatedAt * 1000).toLocaleDateString("zh-CN")}
          </time>
        </div>
      </div>
    </Link>
  );
}

export function ProfileWidget({ site }: { site: SiteSettings }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
      {site.avatarUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={site.avatarUrl}
          alt={site.name}
          className="h-20 w-20 rounded-full object-cover"
          loading="lazy"
        />
      )}
      <div>
        <div className="text-lg font-semibold">{site.name}</div>
        {site.bio && (
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {site.bio}
          </p>
        )}
      </div>
    </div>
  );
}

export function LinksWidget({ site }: { site: SiteSettings }) {
  return (
    <div className="flex h-full flex-col gap-2 p-5">
      <h3 className="card-title">链接</h3>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        {site.socials.length === 0 && (
          <li style={{ color: "var(--muted)" }}>在管理台·站点设置里添加社交链接</li>
        )}
        {site.socials.map((s) => (
          <li key={s.kind + s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener"
              className="underline-offset-4 hover:underline"
              style={{ color: "var(--accent)" }}
            >
              {s.kind}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 引用了不存在/未发布文章的 post 卡占位 */
export function MissingPostCard({ slug }: { slug: string }) {
  return (
    <div className="flex h-full items-center justify-center p-5 text-sm" style={{ color: "var(--muted)" }}>
      文章 “{slug}” 不存在或未发布
    </div>
  );
}
