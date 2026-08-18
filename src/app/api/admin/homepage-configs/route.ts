// 主页配置方案:列表 + 新建(design/09)。
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, homepageConfigs } from "@/db";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { homepageConfigSchema } from "@/lib/homepage-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const list = db
    .select()
    .from(homepageConfigs)
    .orderBy(desc(homepageConfigs.updatedAt))
    .all();
  return NextResponse.json({ configs: list });
}

export async function POST(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as { name?: unknown; data?: unknown } | null;
  const name = String(body?.name ?? "").trim();
  if (!name) return jsonError("方案名不能为空", 400);
  const parsed = homepageConfigSchema.safeParse(body?.data);
  if (!parsed.success) return jsonError(`配置不合法:${parsed.error.issues[0]?.message}`, 400);
  const row = db
    .insert(homepageConfigs)
    .values({
      name,
      data: JSON.stringify(parsed.data),
      isActive: 0,
      updatedAt: Math.floor(Date.now() / 1000),
    })
    .returning()
    .get();
  return NextResponse.json({ id: row.id }, { status: 201 });
}
