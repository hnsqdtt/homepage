"use client";
// 评论区:进入视口才 fetch,评论变化不触发文章页重渲染(design/04)。
// 正文纯文本展示(保留换行,URL 自动成链),分页 20 条时间正序。
import { useCallback, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

interface CommentItem {
  id: number;
  githubId: string;
  githubLogin: string;
  avatarUrl: string;
  body: string;
  createdAt: number;
}

interface Viewer {
  githubId: string;
  githubLogin: string;
  isAdmin: boolean;
}

interface CommentsPayload {
  viewer: Viewer | null;
  comments: CommentItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** 纯文本正文 → 段落 + 自动链接,React 默认转义免 XSS */
function CommentBody({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noopener nofollow" className="underline underline-offset-2" style={{ color: "var(--accent)" }}>
            {p}
          </a>
        ) : (
          p
        ),
      )}
    </p>
  );
}

export default function Comments({ slug }: { slug: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CommentsPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 进入视口才拉取
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          ob.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);

  const load = useCallback(
    async (page: number) => {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/comments?page=${page}`);
      if (!res.ok) return;
      const payload: CommentsPayload = await res.json();
      setData((prev) =>
        page > 1 && prev
          ? { ...payload, comments: [...prev.comments, ...payload.comments] }
          : payload,
      );
    },
    [slug],
  );

  useEffect(() => {
    if (visible) void load(1);
  }, [visible, load]);

  async function submit() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      if (res.ok) {
        setDraft("");
        await load(1);
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "发表失败");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("删除这条评论?")) return;
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (res.ok) await load(1);
  }

  const viewer = data?.viewer ?? null;
  const hasMore = data ? data.page * data.pageSize < data.total : false;

  return (
    <section ref={rootRef} className="mt-14 border-t pt-8" style={{ borderColor: "var(--card-border)" }}>
      <h2 className="mb-5 text-lg font-semibold">
        评论{data ? `(${data.total})` : ""}
      </h2>

      {!data ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          加载中…
        </p>
      ) : (
        <>
          <ul className="space-y-5">
            {data.comments.map((c) => (
              <li key={c.id} className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full" loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-medium">{c.githubLogin}</span>
                    <time className="text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(c.createdAt * 1000).toLocaleString("zh-CN")}
                    </time>
                    {viewer && (viewer.isAdmin || viewer.githubId === c.githubId) && (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        className="text-xs hover:opacity-75"
                        style={{ color: "var(--muted)" }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <CommentBody text={c.body} />
                </div>
              </li>
            ))}
            {data.comments.length === 0 && (
              <li className="text-sm" style={{ color: "var(--muted)" }}>
                还没有评论
              </li>
            )}
          </ul>

          {hasMore && (
            <button
              type="button"
              onClick={() => load(data.page + 1)}
              className="mt-5 text-sm underline underline-offset-4"
              style={{ color: "var(--accent)" }}
            >
              加载更多
            </button>
          )}

          <div className="mt-8">
            {viewer ? (
              <div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder={`以 ${viewer.githubLogin} 的身份评论…`}
                  className="card-surface w-full resize-y p-3 text-sm outline-none"
                  data-shadow="none"
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={submit}
                    disabled={busy || !draft.trim()}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    style={{ background: "var(--accent)" }}
                  >
                    发表评论
                  </button>
                  {error && <span className="text-sm text-red-500">{error}</span>}
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => signIn("github")}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                style={{ background: "var(--accent)" }}
              >
                用 GitHub 登录后评论
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
