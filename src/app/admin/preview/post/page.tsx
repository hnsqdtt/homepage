// 文章整页预览:按游客端文章页原样渲染编辑器中的草稿(localStorage 通道,
// 不落库,已发布文章编辑到一半也能安全预览)。受 middleware 保护,不套管理台外壳。
import { getActiveHomepageConfig } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";
import PostPreviewClient from "./PostPreviewClient";

export const dynamic = "force-dynamic";

export default function PostPreviewPage() {
  const config = getActiveHomepageConfig();
  const site = getSiteSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <p
        className="border-b px-4 py-1.5 text-center text-xs"
        style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}
      >
        整页预览 · 展示的是编辑器中未保存的草稿,关闭窗口返回编辑
      </p>
      <SiteHeader site={site} header={config.header} />
      <main className="flex-1">
        <PostPreviewClient />
      </main>
    </div>
  );
}
