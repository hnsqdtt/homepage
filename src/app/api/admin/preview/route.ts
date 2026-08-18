// 编辑器分屏预览:与发布同一条渲染管线,所见即所得(design/05)。
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  const body = (await req.json().catch(() => null)) as { md?: unknown } | null;
  if (!body || typeof body.md !== "string") return jsonError("参数不合法", 400);
  const r = await renderMarkdown(body.md);
  return NextResponse.json({ html: r.html, needsKatex: r.needsKatex, toc: r.toc });
}
