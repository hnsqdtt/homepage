// 主题参数 → CSS 变量编译(design/09 样式系统):
// 全局主题落在卡片墙容器,单卡 styleOverride 落在卡片元素,变量就近覆盖。
import type { CSSProperties } from "react";
import type { HomepageConfig, StyleOverride } from "@/lib/homepage-config";

export function themeVars(theme: HomepageConfig["theme"]): CSSProperties {
  const t = theme;
  return {
    "--accent": t.accent,
    "--page-max-width": `${t.pageMaxWidth}px`,
    "--card-radius": `${t.card.radius}px`,
    "--card-border-width": `${t.card.borderWidth}px`,
    "--card-opacity": String(t.card.opacity),
    "--card-blur": `${t.card.blurPx}px`,
    "--title-size": `${t.title.size}px`,
    "--title-weight": String(t.title.weight),
    ...(t.title.color ? { "--title-color": t.title.color } : {}),
  } as CSSProperties;
}

export function overrideVars(o?: StyleOverride): CSSProperties {
  if (!o) return {};
  const s: Record<string, string> = {};
  if (o.opacity !== undefined) s["--card-opacity"] = String(o.opacity);
  if (o.blurPx !== undefined) s["--card-blur"] = `${o.blurPx}px`;
  if (o.radius !== undefined) s["--card-radius"] = `${o.radius}px`;
  if (o.borderWidth !== undefined) s["--card-border-width"] = `${o.borderWidth}px`;
  if (o.titleColor) s["--title-color"] = o.titleColor;
  if (o.titleSize !== undefined) s["--title-size"] = `${o.titleSize}px`;
  return s as CSSProperties;
}

/** 卡面质感与阴影:data 属性驱动(见 globals.css .card-surface) */
export function surfaceAttrs(
  theme: HomepageConfig["theme"],
  o?: StyleOverride,
): { "data-surface": string; "data-shadow": string } {
  return {
    "data-surface": o?.surface ?? theme.card.surface,
    "data-shadow": o?.shadow ?? theme.card.shadow,
  };
}
