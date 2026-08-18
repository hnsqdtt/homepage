// 站头:站点名 + 导航 + 暗色切换的简单形态(design/09 已拍板)。
// 显隐与搜索框位置由启用的主页配置驱动,全部 (site) 页面共享。
import Link from "next/link";
import type { HomepageConfig } from "@/lib/homepage-config";
import type { SiteSettings } from "@/lib/site-settings";
import ThemeToggle from "./ThemeToggle";
import UserMenu from "./UserMenu";

export default function SiteHeader({
  site,
  header,
  searchInHeader,
}: {
  site: SiteSettings;
  header: HomepageConfig["header"];
  searchInHeader: boolean;
}) {
  if (!header.show) return null;
  return (
    <header className="mx-auto flex w-full items-center gap-4 px-4 py-4" style={{ maxWidth: "var(--page-max-width, 1200px)" }}>
      <Link href="/" className="text-lg font-bold tracking-tight">
        {site.title}
      </Link>
      {header.showNav && (
        <nav className="flex items-center gap-4 text-sm" style={{ color: "var(--muted)" }}>
          <Link href="/search" className="hover:opacity-75">
            搜索
          </Link>
          <a href="/feed.xml" className="hover:opacity-75">
            RSS
          </a>
        </nav>
      )}
      <div className="ml-auto flex items-center gap-3">
        {searchInHeader && (
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
