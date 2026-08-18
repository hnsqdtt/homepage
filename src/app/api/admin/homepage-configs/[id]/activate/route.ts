// 启用方案:全表单活跃行,触发首页 revalidate(design/09)。
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, homepageConfigs } from "@/db";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return jsonError("参数不合法", 400);
  const row = db.select().from(homepageConfigs).where(eq(homepageConfigs.id, id)).get();
  if (!row) return jsonError("方案不存在", 404);

  db.transaction((tx) => {
    tx.run(sql`UPDATE homepage_configs SET is_active = 0 WHERE is_active = 1`);
    tx.update(homepageConfigs).set({ isActive: 1 }).where(eq(homepageConfigs.id, id)).run();
  });
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
