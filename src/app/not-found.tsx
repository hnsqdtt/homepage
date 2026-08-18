import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="text-6xl font-bold" style={{ color: "var(--muted)" }}>
        404
      </div>
      <p style={{ color: "var(--muted)" }}>页面不存在</p>
      <Link href="/" className="text-sm underline underline-offset-4" style={{ color: "var(--accent)" }}>
        回首页
      </Link>
    </div>
  );
}
