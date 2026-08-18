// 删除评论:本人硬删自己的;管理员删他人的走软删(hidden,可恢复)。
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, comments } from "@/db";
import { jsonError, sameOrigin } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!sameOrigin(req)) return jsonError("非法来源", 403);
  const session = await auth();
  if (!session?.githubId) return jsonError("请先登录", 401);

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return jsonError("参数不合法", 400);

  const row = db.select().from(comments).where(eq(comments.id, id)).get();
  if (!row) return jsonError("评论不存在", 404);

  const isSelf = row.githubId === session.githubId;
  if (!isSelf && !session.isAdmin) return jsonError("无权限", 403);

  if (isSelf) {
    db.delete(comments).where(eq(comments.id, id)).run();
  } else {
    db.update(comments).set({ hidden: 1 }).where(eq(comments.id, id)).run();
  }
  return NextResponse.json({ ok: true });
}
