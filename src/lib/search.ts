// 全站搜索(design/02):查询 ≥3 字符走 FTS5 trigram + bm25,
// 短词回退 LIKE 扫已发布文章——几百篇量级毫秒返回。
import { sql } from "drizzle-orm";
import { db } from "@/db";

export interface SearchHit {
  slug: string;
  title: string;
  /** 命中摘录,<mark> 高亮(FTS snippet;LIKE 回退时为 summary 截断) */
  snippet: string;
  updatedAt: number;
}

const PAGE_SIZE = 20;

function escHtml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function searchPosts(q: string, tag?: string): SearchHit[] {
  const query = q.trim();
  // 纯标签筛选:无关键词时按标签列出
  if (!query) return tag ? listByTag(tag) : [];
  // 长度按 Unicode 码点算,中文两字即回退 LIKE
  const usesFts = [...query].length >= 3;
  return usesFts ? searchFts(query, tag) : searchLike(query, tag);
}

function listByTag(tag: string): SearchHit[] {
  const rows = db.all<{ slug: string; title: string; summary: string; updatedAt: number }>(sql`
    SELECT slug, title, summary, updated_at AS updatedAt
    FROM posts
    WHERE status = 'published' AND tags LIKE ${"%" + JSON.stringify(tag) + "%"}
    ORDER BY updated_at DESC
    LIMIT ${PAGE_SIZE}
  `);
  return rows.map((r) => ({
    slug: r.slug,
    title: r.title,
    snippet: escHtml(r.summary),
    updatedAt: r.updatedAt,
  }));
}

function searchFts(query: string, tag?: string): SearchHit[] {
  // trigram 分词对任意子串匹配;查询词整体作为一个带引号的 phrase,避免 FTS 语法注入
  const phrase = `"${query.replaceAll('"', '""')}"`;
  const tagCond = tag ? sql` AND p.tags LIKE ${"%" + JSON.stringify(tag) + "%"}` : sql``;
  try {
    return db.all<SearchHit>(sql`
      SELECT p.slug AS slug, p.title AS title,
             snippet(posts_fts, 2, '<mark>', '</mark>', '…', 24) AS snippet,
             p.updated_at AS updatedAt
      FROM posts_fts
      JOIN posts p ON p.id = posts_fts.rowid
      WHERE posts_fts MATCH ${phrase}${tagCond}
      ORDER BY bm25(posts_fts, 8.0, 4.0, 1.0)
      LIMIT ${PAGE_SIZE}
    `);
  } catch {
    // 极端非法查询串(如全引号)兜底走 LIKE
    return searchLike(query, tag);
  }
}

function searchLike(query: string, tag?: string): SearchHit[] {
  const like = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const tagCond = tag ? sql` AND tags LIKE ${"%" + JSON.stringify(tag) + "%"}` : sql``;
  const rows = db.all<{ slug: string; title: string; summary: string; contentText: string; updatedAt: number }>(sql`
    SELECT slug, title, summary, content_text AS contentText, updated_at AS updatedAt
    FROM posts
    WHERE status = 'published'
      AND (title LIKE ${like} ESCAPE '\\' OR summary LIKE ${like} ESCAPE '\\' OR content_text LIKE ${like} ESCAPE '\\')${tagCond}
    ORDER BY updated_at DESC
    LIMIT ${PAGE_SIZE}
  `);
  return rows.map((r) => {
    // 手工截取命中上下文并转义,与 snippet() 输出同构
    const source = r.contentText || r.summary;
    const idx = source.indexOf(query);
    const start = Math.max(0, idx - 30);
    const raw = source.slice(start, start + 90);
    const snippet =
      idx >= 0
        ? escHtml(raw).replaceAll(escHtml(query), `<mark>${escHtml(query)}</mark>`)
        : escHtml(r.summary.slice(0, 90));
    return { slug: r.slug, title: r.title, snippet: `${start > 0 ? "…" : ""}${snippet}…`, updatedAt: r.updatedAt };
  });
}
