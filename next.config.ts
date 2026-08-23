import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 部署为自包含产物,镜像里只跑 .next/standalone(design/07)
  output: "standalone",
  // ISR 缓存写入口过滤 404 条目,防扫描灌盘(design/08);dev 无 ISR 落盘,不启用
  cacheHandler:
    process.env.NODE_ENV === "production" ? path.join(process.cwd(), "cache-handler.cjs") : undefined,
  // 图片在上传时已由 sharp 压缩出多尺寸,运行时零处理(design/03)
  images: { unoptimized: true },
  // 原生模块不打包,由 Node 直接 require
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // drizzle 迁移 SQL 是运行时 fs 读取的,手动纳入 standalone 追踪
  outputFileTracingIncludes: { "*": ["./drizzle/**/*"] },
};

export default nextConfig;
