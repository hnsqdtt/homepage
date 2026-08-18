// 岛屿组件名单:服务端渲染管线校验 ::widget 指令引用时只 import 这份纯名单,
// 不触碰组件代码本身。新组件 = 在 registry.ts 注册 loader 并把名字加进来。
export const islandNames = ["counter-demo"] as const;

export type IslandName = (typeof islandNames)[number];
