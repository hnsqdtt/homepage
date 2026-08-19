// /admin 与 /api/admin 白名单拦截:未登录或非管理员一律 404,不暴露存在感(design/06)。
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  // 本地开发旁路:DEV_ADMIN=1 时免登录进管理台(仅 development 构建可达,生产无效)
  if (process.env.NODE_ENV === "development" && process.env.DEV_ADMIN === "1") {
    return NextResponse.next();
  }
  if (req.auth?.githubId && req.auth.githubId === process.env.ADMIN_GITHUB_ID) {
    return NextResponse.next();
  }
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }
  // 改写到不存在的路径,渲染全局 not-found 页并返回 404
  return NextResponse.rewrite(new URL("/__404", req.url));
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
