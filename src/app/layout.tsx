import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "linlang.me",
};

// 首帧前按 localStorage/系统偏好落定暗色 class,防主题闪烁
const themeInit = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
