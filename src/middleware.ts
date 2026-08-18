// /admin 与 /api/admin 白名单拦截:未登录或非管理员一律 404,不暴露存在感(design/06)。
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
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
