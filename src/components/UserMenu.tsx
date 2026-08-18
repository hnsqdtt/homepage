"use client";
// 站头用户菜单:游客与管理员共用的登录入口。
// 登录态在客户端挂载后获取,页面本身保持静态化(design/08)。
import { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";

interface SessionInfo {
  githubLogin?: string;
  isAdmin?: boolean;
  user?: { name?: string | null; image?: string | null };
}

export default function UserMenu() {
  // undefined = 加载中,null = 未登录
  const [session, setSession] = useState<SessionInfo | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: SessionInfo | null) =>
        setSession(j && Object.keys(j).length > 0 ? j : null),
      )
      .catch(() => setSession(null));
  }, []);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [open]);

  if (session === undefined) {
    return <span className="inline-block h-8 w-8" aria-hidden />;
  }

  if (!session) {
    return (
      <button
        type="button"
        onClick={() => signIn("github")}
        className="rounded-lg border px-3 py-1.5 text-sm hover:opacity-80"
        style={{ borderColor: "var(--card-border)" }}
      >
        登录
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="用户菜单"
        className="block rounded-full transition-opacity hover:opacity-80"
      >
        {session.user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.user.image} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-white"
            style={{ background: "var(--accent)" }}
          >
            {(session.githubLogin ?? "?").slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <div
          className="card-surface absolute right-0 top-10 z-50 w-40 py-1 text-sm"
          data-surface="solid"
          data-shadow="soft"
        >
          <div className="border-b px-3 py-2 font-medium" style={{ borderColor: "var(--card-border)" }}>
            {session.githubLogin ?? session.user?.name ?? "已登录"}
          </div>
          {session.isAdmin && (
            <a href="/admin" className="block px-3 py-2 hover:opacity-75">
              管理台
            </a>
          )}
          <button
            type="button"
            onClick={() => signOut()}
            className="block w-full px-3 py-2 text-left hover:opacity-75"
            style={{ color: "var(--muted)" }}
          >
            登出
          </button>
        </div>
      )}
    </div>
  );
}
