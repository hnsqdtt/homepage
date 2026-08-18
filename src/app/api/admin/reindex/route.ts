// FTS 索引重建:自检页发现索引与文章数不一致时使用(design/05)。
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function POST() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  db.run(sql`INSERT INTO posts_fts(posts_fts) VALUES('delete-all')`);
  db.run(sql`
    INSERT INTO posts_fts(rowid, title, summary, content_text)
    SELECT id, title, summary, content_text FROM posts WHERE status = 'published'
  `);
  const c = db.get<{ c: number }>(sql`SELECT count(*) c FROM posts_fts_docsize`);
  return NextResponse.json({ ok: true, indexed: c?.c ?? 0 });
}
