// 版本更新检查(design/05):运行版本 vs GitHub Actions 最近一次成功构建的 head_sha。
// 只认"构建成功"的提交,push 后构建未完成期间不会误报有新版。
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { jsonError } from "@/lib/api-utils";
import { APP_VERSION, GITHUB_REPO, WATCHTOWER_TOKEN } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const { deny } = await requireAdmin();
  if (deny) return deny;
  if (APP_VERSION === "dev") {
    return NextResponse.json({ running: APP_VERSION, updateAvailable: false, note: "开发环境不参与更新检查" });
  }

  let res: Response;
  try {
    res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/deploy.yml/runs?branch=main&status=success&per_page=1`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "homepage-update-check",
          ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch {
    return jsonError("无法访问 GitHub API(网络或超时)", 502);
  }
  if (!res.ok) return jsonError(`GitHub API ${res.status}(私有仓库需配置 GITHUB_TOKEN)`, 502);

  const j = (await res.json()) as {
    workflow_runs?: { head_sha: string; updated_at: string }[];
  };
  const run = j.workflow_runs?.[0];
  if (!run) return jsonError("未找到成功的构建记录", 502);

  return NextResponse.json({
    running: APP_VERSION,
    latest: run.head_sha,
    latestAt: run.updated_at,
    updateAvailable: run.head_sha !== APP_VERSION,
    canUpdate: Boolean(WATCHTOWER_TOKEN),
  });
}
