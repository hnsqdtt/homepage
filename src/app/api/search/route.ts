// 搜索接口:策略见 lib/search.ts(≥3 字符 FTS5,短词 LIKE 回退);按 IP 宽松限流。
import { NextResponse } from "next/server";
import { searchPosts } from "@/lib/search";
import { allowSearch } from "@/lib/rate-limit";
import { clientIp, jsonError } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!allowSearch(clientIp(req))) return jsonError("请求过于频繁", 429);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const tag = url.searchParams.get("tag") ?? undefined;
  const hits = q.trim() || tag ? searchPosts(q, tag) : [];
  return NextResponse.json({ hits });
}
