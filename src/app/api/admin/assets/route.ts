// 资产库 API:列表 / 上传 / 移动·重命名分类 / 删除(带引用检查)。管理员专用。
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import {
  deleteAsset,
  findAssetRefs,
  listAssets,
  moveAssets,
  renameFolder,
  saveUpload,
} from "@/lib/assets";

export const dynamic = "force-dynamic";

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  return NextResponse.json({ assets: await listAssets() });
}

export async function POST(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("缺少文件", 400);
  if (file.size > 25 * 1024 * 1024) return jsonError("文件过大(上限 25MB)", 400);
  const folderRaw = form?.get("folder");
  const folder = typeof folderRaw === "string" && folderRaw.trim() ? folderRaw.trim() : null;
  try {
    return NextResponse.json(await saveUpload(file, folder), { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "上传失败", 400);
  }
}

const patchSchema = z.union([
  // 移动资产到分类(null = 未分类)
  z.object({ urls: z.array(z.string()).min(1), folder: z.string().min(1).max(80).nullable() }),
  // 重命名分类(to 传 null 即解散)
  z.object({ renameFolder: z.object({ from: z.string().min(1), to: z.string().min(1).max(80).nullable() }) }),
]);

export async function PATCH(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("参数错误", 400);
  const p = parsed.data;
  if ("urls" in p) moveAssets(p.urls, p.folder);
  else renameFolder(p.renameFolder.from, p.renameFolder.to);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const sp = new URL(req.url).searchParams;
  const url = sp.get("url");
  if (!url) return jsonError("缺少 url 参数", 400);
  if (sp.get("force") !== "1") {
    const refs = findAssetRefs(url);
    if (refs.total > 0) {
      return NextResponse.json({ error: "资产仍被引用", refs }, { status: 409 });
    }
  }
  return deleteAsset(url) ? NextResponse.json({ ok: true }) : jsonError("文件不存在", 404);
}
