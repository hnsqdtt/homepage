// SQLite 客户端:单进程 + WAL,启动时自动迁移(design/02)。
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DATA_DIR, UPLOADS_DIR } from "@/lib/env";
import * as schema from "./schema";

function createDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const sqlite = new Database(path.join(DATA_DIR, "app.db"));
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });

  // 迁移目录随构建产物分发(next.config 已纳入 tracing;Dockerfile 亦 COPY)
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  if (fs.existsSync(migrationsFolder)) {
    migrate(db, { migrationsFolder });
  }
  return db;
}

// dev 热重载会重复求值模块,用 globalThis 保持单连接
const globalForDb = globalThis as unknown as {
  __db?: ReturnType<typeof createDb>;
};

export const db = globalForDb.__db ?? (globalForDb.__db = createDb());
export * from "./schema";
