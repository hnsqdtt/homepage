// 图库:浏览 / 删除 uploads(design/05)。
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { deleteUpload, listUploads } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  return NextResponse.json({ files: listUploads() });
}

export async function DELETE(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return jsonError("缺少 url 参数", 400);
  return deleteUpload(url)
    ? NextResponse.json({ ok: true })
    : jsonError("文件不存在", 404);
}
