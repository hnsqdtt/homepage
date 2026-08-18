// 主页配置方案:更新 / 删除(启用中的方案不可删)。
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, homepageConfigs } from "@/db";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { homepageConfigSchema } from "@/lib/homepage-config";

export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PUT(req: Request, ctx: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return jsonError("参数不合法", 400);
  const row = db.select().from(homepageConfigs).where(eq(homepageConfigs.id, id)).get();
  if (!row) return jsonError("方案不存在", 404);

  const body = (await req.json().catch(() => null)) as { name?: unknown; data?: unknown } | null;
  const set: Partial<{ name: string; data: string; updatedAt: number }> = {
    updatedAt: Math.floor(Date.now() / 1000),
  };
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return jsonError("方案名不能为空", 400);
    set.name = name;
  }
  if (body?.data !== undefined) {
    const parsed = homepageConfigSchema.safeParse(body.data);
    if (!parsed.success) return jsonError(`配置不合法:${parsed.error.issues[0]?.message}`, 400);
    set.data = JSON.stringify(parsed.data);
  }
  db.update(homepageConfigs).set(set).where(eq(homepageConfigs.id, id)).run();
  // 改的是启用中的方案则立即生效
  if (row.isActive === 1) revalidatePath("/");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return jsonError("参数不合法", 400);
  const row = db.select().from(homepageConfigs).where(eq(homepageConfigs.id, id)).get();
  if (!row) return jsonError("方案不存在", 404);
  if (row.isActive === 1) return jsonError("启用中的方案不能删除,请先启用其他方案", 400);
  db.delete(homepageConfigs).where(eq(homepageConfigs.id, id)).run();
  return NextResponse.json({ ok: true });
}
