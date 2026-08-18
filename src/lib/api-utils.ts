// API 公共工具:错误响应、Origin 同源校验(CSRF)、客户端 IP。
import { NextResponse } from "next/server";

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/** 写操作校验 Origin 与 Host 同源(design/06);无 Origin 的非浏览器请求放行 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** 反代之后取真实 IP:Caddy/Cloudflare 均设 X-Forwarded-For */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff?.split(",")[0]?.trim() || "unknown";
}
