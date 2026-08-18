"use client";
// 暗色切换:跟随系统 + 手动覆盖(存 localStorage);初始 class 由 layout 内联脚本落定防闪烁。
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="切换暗色模式"
      className="rounded-lg border px-2.5 py-1.5 text-sm transition-colors hover:opacity-80"
      style={{ borderColor: "var(--card-border)" }}
    >
      {dark === null ? "…" : dark ? "☀️" : "🌙"}
    </button>
  );
}
