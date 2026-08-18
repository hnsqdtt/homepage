// 站点设置(settings.site):读取 / 保存,保存后全站布局重验证。
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { getSiteSettings, saveSiteSettings, siteSettingsSchema } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  return NextResponse.json({ settings: getSiteSettings() });
}

export async function PUT(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const parsed = siteSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("参数不合法", 400);
  saveSiteSettings(parsed.data);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
