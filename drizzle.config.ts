import path from "node:path";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // drizzle-kit migrate 用(构建前单进程初始化库,防 next build 多 worker 迁移竞态);
  // 与运行时 migrator 共享 __drizzle_migrations 记录,互通
  dbCredentials: {
    url: path.join(path.resolve(process.env.DATA_DIR || "./data"), "app.db"),
  },
});
