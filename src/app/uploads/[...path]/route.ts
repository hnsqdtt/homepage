// /uploads 静态文件:生产由 Caddy 直出(design/07),此路由供 dev 与无 Caddy 场景兜底。
// 文件名为内容 hash,可安全打 immutable 长缓存。
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/env";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const rel = path.normalize((await ctx.params).path.join("/"));
  const abs = path.join(UPLOADS_DIR, rel);
  if (!abs.startsWith(UPLOADS_DIR + path.sep)) return new Response("Not Found", { status: 404 });
  try {
    const buf = await fs.readFile(abs);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": TYPES[path.extname(rel)] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
