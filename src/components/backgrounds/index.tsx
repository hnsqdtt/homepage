// 背景引擎注册表(design/09):V1 内置 none/color/gradient/image,均为纯 CSS 零 JS。
// particles/shader 等 canvas 引擎后续加入时走动态 import,保持未启用零成本。
import type { CSSProperties } from "react";
import type { HomepageConfig } from "@/lib/homepage-config";

type EngineStyles = { light: CSSProperties; dark: CSSProperties } | null;

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** 各引擎把 params 解析为亮暗两套背景样式;色值区分亮暗(design/04) */
const engines: Record<string, (p: Record<string, unknown>) => EngineStyles> = {
  none: () => null,
  color: (p) => ({
    light: { background: str(p.light, "#f6f6f8") },
    dark: { background: str(p.dark, "#101014") },
  }),
  gradient: (p) => {
    const l = (p.light ?? {}) as Record<string, unknown>;
    const d = (p.dark ?? {}) as Record<string, unknown>;
    const grad = (o: Record<string, unknown>, from: string, to: string) =>
      `linear-gradient(${num(o.angle, 160)}deg, ${str(o.from, from)}, ${str(o.to, to)})`;
    return {
      light: { background: grad(l, "#eef1ff", "#fdf3f6") },
      dark: { background: grad(d, "#14141c", "#1c1428") },
    };
  },
  image: (p) => {
    const url = str(p.url);
    if (!url) return null;
    const common: CSSProperties = {
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
    return {
      light: { ...common, backgroundImage: `url(${JSON.stringify(url)})` },
      dark: {
        ...common,
        backgroundImage: `url(${JSON.stringify(str(p.darkUrl) || url)})`,
      },
    };
  },
};

export function BackgroundRenderer({
  background,
  fixed = true,
}: {
  background: HomepageConfig["background"];
  /** 游客端 fixed 全屏;编辑器画布传 false,以 absolute 限定在画布内(外层需 relative + isolate) */
  fixed?: boolean;
}) {
  const render = engines[background.engine];
  const styles = render ? render(background.params) : null;
  if (!styles) return null;
  return (
    <div
      aria-hidden
      className={`${fixed ? "fixed" : "absolute"} inset-0 -z-10 ${background.disableOnMobile ? "max-md:hidden" : ""}`}
    >
      <div className="absolute inset-0 dark:hidden" style={styles.light} />
      <div className="absolute inset-0 hidden dark:block" style={styles.dark} />
      {background.dim > 0 && (
        <div
          className="absolute inset-0"
          style={{ background: `rgb(0 0 0 / ${background.dim})` }}
        />
      )}
    </div>
  );
}
