"use client";
// 示例岛屿组件:验证 ::widget 指令 → 懒挂载链路。
// 用法:::widget{name="counter-demo" start=10 step=2}
import { useState } from "react";

export default function CounterDemo({
  start = 0,
  step = 1,
}: {
  start?: number;
  step?: number;
}) {
  const [n, setN] = useState(start);
  return (
    <div className="card-surface my-4 flex items-center gap-4 p-4" data-shadow="soft">
      <button
        type="button"
        onClick={() => setN((v) => v + step)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
        style={{ background: "var(--accent)" }}
      >
        +{step}
      </button>
      <span className="tabular-nums text-lg">{n}</span>
      <span className="text-sm" style={{ color: "var(--muted)" }}>
        这是一个嵌入文章的交互岛屿
      </span>
    </div>
  );
}
