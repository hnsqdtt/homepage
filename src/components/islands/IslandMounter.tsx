"use client";
// 岛屿挂载器:发现正文里的占位节点,进入视口才动态加载并挂载对应组件。
// 不含组件的文章不会渲染本组件之外的任何额外 JS(design/03)。
import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { islandLoaders } from "./registry";

/** 指令属性都是字符串,挂载前做数字/布尔的朴素转换 */
function coerceProps(raw: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === "true") out[k] = true;
    else if (v === "false") out[k] = false;
    else if (v !== "" && !Number.isNaN(Number(v))) out[k] = Number(v);
    else out[k] = v;
  }
  return out;
}

export default function IslandMounter({ scopeId }: { scopeId: string }) {
  useEffect(() => {
    const scope = document.getElementById(scopeId);
    if (!scope) return;
    const slots = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-island]:not([data-mounted])"),
    );
    if (slots.length === 0) return;

    const roots: ReturnType<typeof createRoot>[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          el.dataset.mounted = "1";
          const name = el.dataset.island ?? "";
          const loader = islandLoaders[name];
          if (!loader) {
            el.innerHTML = "";
            el.className = "island-slot island-missing";
            el.textContent = `组件 "${name}" 未注册`;
            continue;
          }
          let props: Record<string, unknown> = {};
          try {
            props = coerceProps(JSON.parse(el.dataset.props ?? "{}"));
          } catch {
            /* 属性解析失败按空 props 挂载 */
          }
          loader().then((mod) => {
            const root = createRoot(el);
            roots.push(root);
            root.render(createElement(mod.default, props));
          });
        }
      },
      { rootMargin: "200px" },
    );
    slots.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      // 卸载延后到空闲,避开 React 渲染期间同步卸载告警
      setTimeout(() => roots.forEach((r) => r.unmount()), 0);
    };
  }, [scopeId]);

  return null;
}
