"use client";
// 全部文章的筛选与视图:日期排序、日历跳转(该日及更早)、标签筛选、列表/卡片双视图。
// 卡片视图复用 PostCard,但不吃主页配置的主题(:root 默认变量即"固定样式")。
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ArchivePost } from "@/lib/data";
import { PostCard } from "@/components/cards/basic-cards";

type Sort = "new" | "old";
type View = "list" | "cards";

export default function PostsExplorer({ posts }: { posts: ArchivePost[] }) {
  const [sort, setSort] = useState<Sort>("new");
  const [tag, setTag] = useState<string | null>(null);
  const [until, setUntil] = useState("");
  const [view, setView] = useState<View>("list");

  // 视图偏好本地记忆;挂载后再读,避免 SSR 水合不一致
  useEffect(() => {
    const saved = localStorage.getItem("posts-view");
    if (saved === "cards" || saved === "list") setView(saved);
  }, []);
  function switchView(v: View) {
    setView(v);
    localStorage.setItem("posts-view", v);
  }

  const tags = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of posts) for (const t of p.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [posts]);

  const shown = useMemo(() => {
    let list = posts;
    if (tag) list = list.filter((p) => p.tags.includes(tag));
    if (until) {
      // 跳到某天:显示该日期当天(本地时区)及更早发布的文章
      const cutoff = new Date(`${until}T23:59:59`).getTime() / 1000;
      list = list.filter((p) => p.createdAt <= cutoff);
    }
    return [...list].sort((a, b) =>
      sort === "old" ? a.createdAt - b.createdAt : b.createdAt - a.createdAt,
    );
  }, [posts, tag, until, sort]);

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <h1 className="text-xl font-semibold">全部文章</h1>
        <span className="text-sm" style={{ color: "var(--muted)" }}>
          {shown.length} / {posts.length} 篇
        </span>
        <div className="ml-auto flex gap-1 text-sm">
          {(
            [
              ["list", "列表"],
              ["cards", "卡片"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => switchView(v)}
              className="card-surface px-3 py-1.5"
              data-shadow="none"
              style={
                view === v
                  ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                  : { color: "var(--muted)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="card-surface px-2.5 py-1.5 outline-none"
          data-shadow="none"
        >
          <option value="new">最新在前</option>
          <option value="old">最早在前</option>
          <option value="hot" disabled>
            按热度(浏览量上线后开放)
          </option>
        </select>
        <label className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
          跳到日期
          <input
            type="date"
            value={until}
            onChange={(e) => setUntil(e.target.value)}
            className="card-surface px-2.5 py-1.5 outline-none"
            data-shadow="none"
          />
        </label>
        {until && (
          <button type="button" onClick={() => setUntil("")} className="hover:opacity-75" style={{ color: "var(--accent)" }}>
            清除日期
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 text-sm">
          {tags.map(([t, n]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              className="card-surface px-2.5 py-1"
              data-shadow="none"
              style={
                tag === t
                  ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                  : { color: "var(--muted)" }
              }
            >
              #{t} <span className="opacity-70">{n}</span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 && (
        <p className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
          没有符合条件的文章
        </p>
      )}

      {view === "list" ? (
        <ul>
          {shown.map((p) => (
            <li key={p.slug} className="border-b py-3" style={{ borderColor: "var(--card-border)" }}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <time className="w-24 shrink-0 text-sm tabular-nums" style={{ color: "var(--muted)" }}>
                  {new Date(p.createdAt * 1000).toLocaleDateString("zh-CN")}
                </time>
                <Link href={`/posts/${p.slug}`} className="font-medium underline-offset-4 hover:underline">
                  {p.title}
                </Link>
                <span className="flex gap-2 text-xs" style={{ color: "var(--muted)" }}>
                  {p.tags.map((t) => (
                    <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} className="hover:opacity-75">
                      #{t}
                    </button>
                  ))}
                </span>
              </div>
              {p.summary && (
                <p className="mt-1 line-clamp-2 pl-27 text-sm max-sm:pl-0" style={{ color: "var(--muted)" }}>
                  {p.summary}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <div key={p.slug} className="card-surface h-64 overflow-hidden" data-surface="solid" data-shadow="soft">
              <PostCard post={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
