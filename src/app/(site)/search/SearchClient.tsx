"use client";
// 搜索交互:输入防抖后请求 /api/search(design/04)。
// 支持 `#标签` 语法(可多个,与关键词自由组合);?tag= 进入时转为 #标签 填入输入框。
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
  const [q, setQ] = useState(() => {
    const tag = params.get("tag");
    if (tag) return `#${tag} `;
    return params.get("q") ?? "";
  });
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    const query = q.trim();
    if (!query) {
      setHits(null);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setHits((await res.json()).hits);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [q]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <input
        type="search"
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索文章…(#标签 按标签筛选,可与关键词组合)"
        className="card-surface w-full px-4 py-3 outline-none"
        data-shadow="soft"
      />

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
