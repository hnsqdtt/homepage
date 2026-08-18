// 环境变量集中读取:路径一律经 DATA_DIR(design/00 硬约束)。
import path from "node:path";

/** 唯一可变数据目录的绝对路径(开发 ./data,容器 /data) */
export const DATA_DIR = path.resolve(process.env.DATA_DIR || "./data");

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");

/** 游客端绝对链接前缀(RSS/sitemap/OG),无尾斜杠 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

/** 管理员 GitHub 数字 ID(白名单,单人) */
export const ADMIN_GITHUB_ID = process.env.ADMIN_GITHUB_ID || "";

/** 镜像构建时注入的版本号(git commit 短 SHA),健康探针返回 */
export const APP_VERSION = process.env.APP_VERSION || "dev";
