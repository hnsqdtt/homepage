// 管理台评论列表:全站倒序,可按文章过滤(design/05)。
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, comments, posts } from "@/db";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const postId = Number(new URL(req.url).searchParams.get("postId")) || undefined;
  const base = db
    .select({
      id: comments.id,
      postId: comments.postId,
      postTitle: posts.title,
      postSlug: posts.slug,
      githubLogin: comments.githubLogin,
      avatarUrl: comments.avatarUrl,
      body: comments.body,
      hidden: comments.hidden,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(posts, eq(posts.id, comments.postId))
    .orderBy(desc(comments.createdAt))
    .limit(200);
  const list = postId ? base.where(eq(comments.postId, postId)).all() : base.all();
  return NextResponse.json({ comments: list });
}
