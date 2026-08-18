// 评论管理:全站倒序 + 按文章过滤 + 软删/恢复(design/05)。
"use client";
import { useCallback, useEffect, useState } from "react";

interface AdminComment {
  id: number;
  postId: number;
  postTitle: string;
  postSlug: string;
  githubLogin: string;
  avatarUrl: string;
  body: string;
  hidden: number;
  createdAt: number;
}

export default function AdminCommentsPage() {
  const [list, setList] = useState<AdminComment[]>([]);
  const [filter, setFilter] = useState<number | 0>(0);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/comments${filter ? `?postId=${filter}` : ""}`);
    if (res.ok) setList((await res.json()).comments);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setHidden(id: number, hidden: boolean) {
    await fetch(`/api/admin/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden }),
    });
    await load();
  }

  const postOptions = [...new Map(list.map((c) => [c.postId, c.postTitle])).entries()];

  return (
    <div>
      <div className="mb-5 flex items-center gap-4">
        <h1 className="text-xl font-semibold">评论</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(Number(e.target.value))}
          className="card-surface px-2 py-1.5 text-sm outline-none"
          data-shadow="none"
        >
          <option value={0}>全部文章</option>
          {postOptions.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-3">
        {list.map((c) => {
          const long = c.body.length > 200;
          const open = expanded.has(c.id);
          return (
            <li key={c.id} className="card-surface p-4" data-shadow="none" style={c.hidden ? { opacity: 0.5 } : undefined}>
              <div className="flex items-center gap-2 text-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.avatarUrl} alt="" className="h-6 w-6 rounded-full" loading="lazy" />
                <span className="font-medium">{c.githubLogin}</span>
                <a href={`/posts/${c.postSlug}`} target="_blank" className="text-xs underline underline-offset-2" style={{ color: "var(--muted)" }}>
                  {c.postTitle}
                </a>
                <time className="text-xs" style={{ color: "var(--muted)" }}>
                  {new Date(c.createdAt * 1000).toLocaleString("zh-CN")}
                </time>
                {c.hidden === 1 && (
                  <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-xs text-red-500">已隐藏</span>
                )}
                <span className="ml-auto flex gap-3 text-xs">
                  {c.hidden === 0 ? (
                    <button type="button" onClick={() => setHidden(c.id, true)} className="text-red-500 hover:opacity-75">
                      隐藏
                    </button>
                  ) : (
                    <button type="button" onClick={() => setHidden(c.id, false)} className="hover:opacity-75" style={{ color: "var(--accent)" }}>
                      恢复
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {long && !open ? `${c.body.slice(0, 200)}…` : c.body}
                {long && (
                  <button
                    type="button"
                    className="ml-2 text-xs underline underline-offset-2"
                    style={{ color: "var(--muted)" }}
                    onClick={() =>
                      setExpanded((s) => {
                        const n = new Set(s);
                        if (n.has(c.id)) n.delete(c.id);
                        else n.add(c.id);
                        return n;
                      })
                    }
                  >
                    {open ? "收起" : "展开"}
                  </button>
                )}
              </p>
            </li>
          );
        })}
        {list.length === 0 && (
          <li className="py-10 text-center text-sm" style={{ color: "var(--muted)" }}>
            暂无评论
          </li>
        )}
      </ul>
    </div>
  );
}
