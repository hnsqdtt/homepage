// 一键导出:流式 zip 下载(design/07)。
import { Readable } from "node:stream";
import { requireAdmin } from "@/lib/admin-guard";
import { createExportArchive } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const { archive, cleanup } = createExportArchive();
  archive.on("close", cleanup);
  archive.on("error", cleanup);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(Readable.toWeb(archive) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="export-${stamp}.zip"`,
    },
  });
}
