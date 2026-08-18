// 编辑器画布的数据解析:对草稿配置走与游客端同一条 buildHomepageData 路径,
// 顺带下发文章选项与标签清单供表单使用(design/05 所见即所得)。
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { homepageConfigSchema } from "@/lib/homepage-config";
import { buildHomepageData, getArchiveList } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as { data?: unknown } | null;
  const parsed = homepageConfigSchema.safeParse(body?.data);
  if (!parsed.success) return jsonError(`配置不合法:${parsed.error.issues[0]?.message}`, 400);
  const d = buildHomepageData(parsed.data);
  const archive = getArchiveList();
  return NextResponse.json({
    site: getSiteSettings(),
    posts: Object.fromEntries(d.postMap),
    carousels: Object.fromEntries(d.carouselPosts),
    autoFlowPosts: d.autoFlowPosts,
    postOptions: archive.map((p) => ({ slug: p.slug, title: p.title })),
    allTags: [...new Set(archive.flatMap((p) => p.tags))],
  });
}
