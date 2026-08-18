// 图片上传:管理员专用,sharp 串行处理(design/03、06)。
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { saveImage } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return jsonError("缺少文件", 400);
  if (file.size > 25 * 1024 * 1024) return jsonError("文件过大(上限 25MB)", 400);
  try {
    const result = await saveImage(file);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "上传失败", 400);
  }
}
