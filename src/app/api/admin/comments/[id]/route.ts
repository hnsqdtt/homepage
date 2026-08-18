// 评论软删/恢复(design/05):hidden 标记,游客端即时消失。
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, comments } from "@/db";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return jsonError("参数不合法", 400);
  const body = (await req.json().catch(() => null)) as { hidden?: unknown } | null;
  const hidden = body?.hidden === 1 || body?.hidden === true ? 1 : 0;
  const row = db
    .update(comments)
    .set({ hidden })
    .where(eq(comments.id, id))
    .returning({ id: comments.id })
    .get();
  if (!row) return jsonError("评论不存在", 404);
  return NextResponse.json({ ok: true });
}
