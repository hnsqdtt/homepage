// 一键更新(design/05):触发 watchtower 拉新镜像并重建 app 容器。
// 本容器随后会被替换,因此只等一个短窗口捕获"连不上/鉴权失败",不等待更新完成;
// 前端以轮询 /api/health 的版本号变化来确认更新落地。
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { WATCHTOWER_TOKEN, WATCHTOWER_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  if (!WATCHTOWER_TOKEN) {
    return jsonError("未配置 WATCHTOWER_TOKEN,一键更新不可用(见 DEPLOY.md 日常发布)", 501);
  }

  const req = fetch(`${WATCHTOWER_URL}/v1/update`, {
    method: "POST",
    headers: { Authorization: `Bearer ${WATCHTOWER_TOKEN}` },
  });
  req.catch(() => {});
  const earlyError = await Promise.race<string | null>([
    req.then(
      (r) => (r.ok ? null : `watchtower 返回 ${r.status}(检查令牌是否一致)`),
      (e) => `无法连接 watchtower:${e instanceof Error ? e.message : String(e)}`,
    ),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
  ]);
  if (earlyError) return jsonError(earlyError, 502);
  return NextResponse.json({ ok: true });
}
