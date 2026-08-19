"use client";
// 目录导航:点击平滑滚动到章节并同步 hash;系统开启"减少动态"时退回瞬时跳转。
import type { TocItem } from "@/lib/markdown";

export default function TocNav({ toc, className = "" }: { toc: TocItem[]; className?: string }) {
  function go(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const el = document.getElementById(id);
    if (!el) return; // 找不到目标则走浏览器默认锚点行为
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const before = window.scrollY;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    history.replaceState(null, "", `#${id}`);
    if (reduce) return;
    // 个别环境禁用了平滑滚动(smooth 完全不产生位移),短暂检测后退回瞬时跳转
    setTimeout(() => {
      if (window.scrollY === before && Math.abs(el.getBoundingClientRect().top) > 40) {
        el.scrollIntoView();
      }
    }, 250);
  }

  return (
    <ul className={`space-y-1.5 ${className}`}>
      {toc.map((item) => (
        <li key={item.id} style={{ paddingLeft: (item.depth - 2) * 12 }}>
          <a
            href={`#${item.id}`}
            onClick={(e) => go(e, item.id)}
            className="block truncate leading-snug hover:opacity-75"
            style={{ color: "var(--muted)" }}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
