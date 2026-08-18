// 管理台布局:单人内部界面(design/05);middleware 已保证仅管理员可达。
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

// 管理台全部实时读库,不参与静态化
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin/posts", label: "文章" },
  { href: "/admin/comments", label: "评论" },
  { href: "/admin/homepage", label: "主页" },
  { href: "/admin/uploads", label: "图库" },
  { href: "/admin/settings", label: "设置" },
  { href: "/admin/health", label: "自检" },
  { href: "/admin/export", label: "导出" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4">
      <header className="flex items-center gap-5 border-b py-3" style={{ borderColor: "var(--card-border)" }}>
        <Link href="/admin/posts" className="font-bold">
          管理台
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm" style={{ color: "var(--muted)" }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:opacity-75">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/" className="text-sm hover:opacity-75" style={{ color: "var(--muted)" }}>
            回站点 →
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 py-6">{children}</main>
    </div>
  );
}
