// 游客端布局:站头 + 内容 + 页脚。站头形态由启用的主页配置驱动。
import type { Metadata } from "next";
import { getActiveHomepageConfig } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import SiteHeader from "@/components/SiteHeader";

// RSS 自动发现:全部游客页声明订阅源
export const metadata: Metadata = {
  alternates: { types: { "application/rss+xml": "/feed.xml" } },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const config = getActiveHomepageConfig();
  const site = getSiteSettings();
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader site={site} header={config.header} />
      <main className="flex-1">{children}</main>
      <footer
        className="mx-auto w-full px-4 py-8 text-center text-xs"
        style={{ color: "var(--muted)", maxWidth: "var(--page-max-width, 1200px)" }}
      >
        {site.footerText || `© ${new Date().getFullYear()} ${site.name}`}
      </footer>
    </div>
  );
}
