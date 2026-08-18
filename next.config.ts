import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 部署为自包含产物,镜像里只跑 .next/standalone(design/07)
  output: "standalone",
  // 图片在上传时已由 sharp 压缩出多尺寸,运行时零处理(design/03)
  images: { unoptimized: true },
  // 原生模块不打包,由 Node 直接 require
  serverExternalPackages: ["better-sqlite3", "sharp"],
  // drizzle 迁移 SQL 是运行时 fs 读取的,手动纳入 standalone 追踪
  outputFileTracingIncludes: { "*": ["./drizzle/**/*"] },
};

export default nextConfig;
