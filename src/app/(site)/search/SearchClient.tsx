"use client";
// 搜索交互:输入防抖后请求 /api/search(design/04);结果含 <mark> 高亮摘录。
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Hit {
  slug: string;
  title: string;
  snippet: string;
  updatedAt: number;
}

export default function SearchClient() {
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [tag] = useState(params.get("tag") ?? "");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    const query = q.trim();
    if (!query && !tag) {
      setHits(null);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/search?q=${encodeURIComponent(query)}${tag ? `&tag=${encodeURIComponent(tag)}` : ""}`;
        const res = await fetch(url);
        if (res.ok) setHits((await res.json()).hits);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q, tag]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <input
        type="search"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索文章标题、正文…"
        className="card-surface w-full px-4 py-3 outline-none"
        data-shadow="soft"
      />
      {tag && (
        <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
          标签筛选:{tag}{" "}
          <Link href="/search" className="underline underline-offset-2">
            清除
          </Link>
        </p>
      )}

      <div className="mt-6 space-y-5">
        {loading && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            搜索中…
          </p>
        )}
        {hits?.map((h) => (
          <Link key={h.slug} href={`/posts/${h.slug}`} className="card-surface block p-4 hover:opacity-90" data-shadow="none">
            <div className="font-medium">{h.title}</div>
            <p
              className="search-snippet mt-1 text-sm leading-relaxed"
              style={{ color: "var(--muted)" }}
              dangerouslySetInnerHTML={{ __html: h.snippet }}
            />
          </Link>
        ))}
        {hits && hits.length === 0 && !loading && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            没有找到相关内容
          </p>
        )}
      </div>
    </div>
  );
}
