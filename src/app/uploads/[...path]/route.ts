// /uploads 静态文件:生产由 Caddy 直出(design/07),此路由供 dev 与无 Caddy 场景兜底。
// 文件名为内容 hash,可安全打 immutable 长缓存。
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/env";
import { ASSET_MIME_BY_EXT } from "@/lib/mime";

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const rel = path.normalize((await ctx.params).path.join("/"));
  const abs = path.join(UPLOADS_DIR, rel);
  if (!abs.startsWith(UPLOADS_DIR + path.sep)) return new Response("Not Found", { status: 404 });
  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(rel);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": ASSET_MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        // svg 可内嵌脚本,sandbox 禁其执行(img/背景引用不受影响);Caddy 直出同款头
        ...(ext === ".svg" ? { "Content-Security-Policy": "sandbox" } : {}),
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
