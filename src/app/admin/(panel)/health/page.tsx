// 系统自检(design/05):部署/迁移/升级后打开,一页看清健康状态,全绿即成功。
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { countPublished } from "@/lib/data";
import { APP_VERSION, DATA_DIR, UPLOADS_DIR } from "@/lib/env";
import ReindexButton from "./ReindexButton";
import UpdateChecker from "./UpdateChecker";

type Level = "ok" | "warn" | "fail";

interface CheckItem {
  label: string;
  level: Level;
  detail: string;
  action?: React.ReactNode;
}

function envChecks(): CheckItem[] {
  const required = ["AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET", "ADMIN_GITHUB_ID", "AUTH_URL"];
  const missing = required.filter((k) => !process.env[k]);
  return [
    {
      label: "必需环境变量",
      level: missing.length === 0 ? "ok" : "fail",
      detail: missing.length === 0 ? `${required.length} 项齐全` : `缺失:${missing.join(", ")}`,
    },
    { label: "运行版本", level: "ok", detail: APP_VERSION },
  ];
}

function storageChecks(): CheckItem[] {
  const items: CheckItem[] = [];

  try {
    const mode = db.get<{ journal_mode: string }>(sql`PRAGMA journal_mode`);
    db.run(sql`CREATE TABLE IF NOT EXISTS _health_probe (v integer)`);
    db.run(sql`DROP TABLE _health_probe`);
    const wal = mode?.journal_mode?.toLowerCase() === "wal";
    items.push({
      label: "SQLite 读写 / WAL",
      level: wal ? "ok" : "warn",
      detail: wal ? "可读写,journal_mode=wal" : `可读写,journal_mode=${mode?.journal_mode}(期望 wal)`,
    });
  } catch (e) {
    items.push({ label: "SQLite 读写 / WAL", level: "fail", detail: String(e) });
  }

  try {
    const ftsCount = db.get<{ c: number }>(sql`SELECT count(*) c FROM posts_fts_docsize`)?.c ?? 0;
    const pub = countPublished();
    const match = ftsCount === pub;
    items.push({
      label: "FTS 索引一致性",
      level: match ? "ok" : "warn",
      detail: `索引 ${ftsCount} 行 / 已发布 ${pub} 篇`,
      action: match ? undefined : <ReindexButton />,
    });
  } catch (e) {
    items.push({ label: "FTS 索引一致性", level: "fail", detail: String(e) });
  }

  try {
    const probe = path.join(UPLOADS_DIR, ".write-probe");
    fs.writeFileSync(probe, "1");
    fs.rmSync(probe);
    items.push({ label: "uploads 可写", level: "ok", detail: UPLOADS_DIR });
  } catch (e) {
    items.push({ label: "uploads 可写", level: "fail", detail: String(e) });
  }

  try {
    const st = fs.statfsSync(DATA_DIR);
    const freeGb = (st.bavail * st.bsize) / 1024 ** 3;
    items.push({
      label: "磁盘剩余空间",
      level: freeGb > 2 ? "ok" : freeGb > 0.5 ? "warn" : "fail",
      detail: `${freeGb.toFixed(1)} GB`,
    });
  } catch {
    items.push({ label: "磁盘剩余空间", level: "warn", detail: "无法读取" });
  }

  return items;
}

function backupCheck(): CheckItem {
  const dir = path.join(DATA_DIR, "backups");
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith("app-") && f.endsWith(".db"))
      .map((f) => fs.statSync(path.join(dir, f)).mtimeMs)
      .sort((a, b) => b - a);
    if (files.length === 0) throw new Error("empty");
    const ageH = (Date.now() - files[0]) / 3_600_000;
    return {
      label: "最新备份快照",
      level: ageH <= 48 ? "ok" : "warn",
      detail: `${ageH.toFixed(1)} 小时前,共 ${files.length} 份`,
    };
  } catch {
    return {
      label: "最新备份快照",
      level: "warn",
      detail: "未发现备份(部署后按 DEPLOY.md 第 7 节配置每日 cron)",
    };
  }
}

function resourceCheck(): CheckItem {
  const rssMb = process.memoryUsage().rss / 1024 / 1024;
  return {
    label: "进程内存(RSS)",
    level: rssMb < 350 ? "ok" : rssMb < 600 ? "warn" : "fail",
    detail: `${rssMb.toFixed(0)} MB(预算 250-350MB,design/08)`,
  };
}

const LEVEL_STYLE: Record<Level, { dot: string; text: string }> = {
  ok: { dot: "#22c55e", text: "正常" },
  warn: { dot: "#eab308", text: "注意" },
  fail: { dot: "#ef4444", text: "异常" },
};

export default function HealthPage() {
  const groups: { title: string; items: CheckItem[] }[] = [
    { title: "环境", items: envChecks() },
    { title: "存储", items: storageChecks() },
    { title: "备份", items: [backupCheck()] },
    { title: "资源", items: [resourceCheck()] },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold">系统自检</h1>
      <div className="space-y-6">
        <UpdateChecker />
        {groups.map((g) => (
          <section key={g.title}>
            <h2 className="mb-2 text-sm font-medium" style={{ color: "var(--muted)" }}>
              {g.title}
            </h2>
            <ul className="card-surface divide-y" data-shadow="none" style={{ borderColor: "var(--card-border)" }}>
              {g.items.map((item) => (
                <li key={item.label} className="flex items-center gap-3 px-4 py-3 text-sm" style={{ borderColor: "var(--card-border)" }}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: LEVEL_STYLE[item.level].dot }} />
                  <span className="w-40 shrink-0 font-medium">{item.label}</span>
                  <span className="min-w-0 break-all" style={{ color: "var(--muted)" }}>
                    {item.detail}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2">
                    {item.action}
                    <span className="text-xs" style={{ color: LEVEL_STYLE[item.level].dot }}>
                      {LEVEL_STYLE[item.level].text}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
        公开探针:GET /api/health(compose healthcheck 与外部拨测用)
      </p>
    </div>
  );
}
