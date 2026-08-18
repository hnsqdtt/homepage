// 管理台单篇文章:读取 / 更新(全量渲染)/ 硬删。
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, posts } from "@/db";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { deletePost, postInputSchema, updatePost } from "@/lib/posts";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function parseId(ctx: Ctx): Promise<number | null> {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) ? id : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const id = await parseId(ctx);
  if (id === null) return jsonError("参数不合法", 400);
  const row = db.select().from(posts).where(eq(posts.id, id)).get();
  if (!row) return jsonError("文章不存在", 404);
  return NextResponse.json({ post: row });
}

export async function PUT(req: Request, ctx: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const id = await parseId(ctx);
  if (id === null) return jsonError("参数不合法", 400);
  const parsed = postInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(parsed.error.issues[0]?.message ?? "参数不合法", 400);
  try {
    const row = await updatePost(id, parsed.data);
    return NextResponse.json({ post: row });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "保存失败", 400);
  }
}

/** 快捷发布/下线:只切状态,不动内容渲染产物 */
export async function PATCH(req: Request, ctx: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const id = await parseId(ctx);
  if (id === null) return jsonError("参数不合法", 400);
  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  if (body?.status !== "draft" && body?.status !== "published")
    return jsonError("参数不合法", 400);
  const row = db
    .update(posts)
    .set({ status: body.status, updatedAt: Math.floor(Date.now() / 1000) })
    .where(eq(posts.id, id))
    .returning({ slug: posts.slug })
    .get();
  if (!row) return jsonError("文章不存在", 404);
  revalidatePath(`/posts/${row.slug}`);
  revalidatePath("/");
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const id = await parseId(ctx);
  if (id === null) return jsonError("参数不合法", 400);
  deletePost(id);
  return NextResponse.json({ ok: true });
}
