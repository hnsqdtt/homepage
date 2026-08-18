// 评论读写(design/04、06)。读:公开分页;写:需登录 + 限流 + Origin 同源。
import { NextResponse } from "next/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db, comments, posts } from "@/db";
import { allowComment } from "@/lib/rate-limit";
import { jsonError, sameOrigin } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

interface Ctx {
  params: Promise<{ slug: string }>;
}

function findPublishedPost(slug: string) {
  return db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.slug, slug), eq(posts.status, "published")))
    .get();
}

export async function GET(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const post = findPublishedPost(slug);
  if (!post) return jsonError("文章不存在", 404);

  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page")) || 1);
  const visible = and(eq(comments.postId, post.id), eq(comments.hidden, 0));

  const list = db
    .select({
      id: comments.id,
      githubId: comments.githubId,
      githubLogin: comments.githubLogin,
      avatarUrl: comments.avatarUrl,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(visible)
    .orderBy(asc(comments.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)
    .all();
  const total = db.select({ c: sql<number>`count(*)` }).from(comments).where(visible).get()?.c ?? 0;

  const session = await auth();
  const viewer = session?.githubId
    ? {
        githubId: session.githubId,
        githubLogin: session.githubLogin ?? "",
        isAdmin: session.isAdmin ?? false,
      }
    : null;

  return NextResponse.json({ viewer, comments: list, total, page, pageSize: PAGE_SIZE });
}

export async function POST(req: Request, { params }: Ctx) {
  if (!sameOrigin(req)) return jsonError("非法来源", 403);
  const session = await auth();
  if (!session?.githubId) return jsonError("请先登录", 401);

  const { slug } = await params;
  const post = findPublishedPost(slug);
  if (!post) return jsonError("文章不存在", 404);

  let body = "";
  try {
    body = String(((await req.json()) as { body?: unknown }).body ?? "").trim();
  } catch {
    return jsonError("请求体不合法", 400);
  }
  if (!body) return jsonError("评论不能为空", 400);
  if (body.length > 2000) return jsonError("评论最长 2000 字", 400);

  if (!allowComment(session.githubId)) return jsonError("发得太快了,稍后再试", 429);

  const row = db
    .insert(comments)
    .values({
      postId: post.id,
      githubId: session.githubId,
      githubLogin: session.githubLogin ?? "",
      avatarUrl: session.user?.image ?? "",
      body,
      createdAt: Math.floor(Date.now() / 1000),
    })
    .returning()
    .get();

  return NextResponse.json({ id: row.id }, { status: 201 });
}
