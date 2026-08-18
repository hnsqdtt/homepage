// 岛屿组件注册表:name → 动态 import,进入视口才加载(design/03)。
// 内容引用代码,代码永远在仓库里受版本管理。
import type { ComponentType } from "react";

export const islandLoaders: Record<
  string,
  () => Promise<{ default: ComponentType<Record<string, unknown>> }>
> = {
  "counter-demo": () => import("./CounterDemo"),
};
