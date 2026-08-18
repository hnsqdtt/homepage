// 站头:站点名 + 导航(全部文章)+ 搜索框 + 暗色切换(design/09)。
// 显隐由启用的主页配置驱动,全部 (site) 页面共享。
import Link from "next/link";
import type { HomepageConfig } from "@/lib/homepage-config";
import type { SiteSettings } from "@/lib/site-settings";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function SiteHeader({
  site,
  header,
}: {
  site: SiteSettings;
  header: HomepageConfig["header"];
}) {
  if (!header.show) return null;
  return (
    <header className="mx-auto flex w-full items-center gap-4 px-4 py-4" style={{ maxWidth: "var(--page-max-width, 1200px)" }}>
      <Link href="/" className="text-lg font-bold tracking-tight">
        {site.title}
      </Link>
      {header.showNav && (
        <nav className="flex items-center gap-4 text-sm" style={{ color: "var(--muted)" }}>
          <Link href="/posts" className="hover:opacity-75">
            全部文章
          </Link>
          {/* 窄屏收不下输入框,降级为搜索页链接 */}
          {header.showSearch && (
            <Link href="/search" className="hover:opacity-75 sm:hidden">
              搜索
            </Link>
          )}
        </nav>
      )}
      <div className="ml-auto flex items-center gap-3">
        {header.showSearch && (
          <form action="/search" className="hidden sm:block">
            <input
              type="search"
              name="q"
              placeholder="搜索…"
              className="card-surface w-44 px-3 py-1.5 text-sm outline-none focus:ring-2"
              style={{ borderRadius: 10 }}
            />
          </form>
        )}
        {header.showThemeToggle && <ThemeToggle />}
        <UserMenu />
      </div>
    </header>
  );
}
