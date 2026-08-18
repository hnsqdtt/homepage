// 管理台文章列表 + 创建。
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, posts } from "@/db";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { createPost, postInputSchema } from "@/lib/posts";

export const dynamic = "force-dynamic";

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const list = db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .orderBy(desc(posts.updatedAt))
    .all();
  return NextResponse.json({ posts: list });
}

export async function POST(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const parsed = postInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "参数不合法", 400);
  try {
    const row = await createPost(parsed.data);
    return NextResponse.json({ id: row.id }, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "创建失败", 400);
  }
}
