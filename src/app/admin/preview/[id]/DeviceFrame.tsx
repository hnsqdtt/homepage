"use client";
// 三端预览:iframe 定宽才能让响应式媒体查询按目标宽度生效。
// 设备按钮只在当前屏幕放得下时显示(桌面≥1024、平板≥768,手机始终可用)。
import { useState } from "react";

const DEVICES = [
  { key: "desktop", label: "桌面", width: null, hide: "max-lg:hidden" },
  { key: "tablet", label: "平板", width: 768, hide: "max-md:hidden" },
  { key: "mobile", label: "手机", width: 390, hide: "" },
] as const;

type DeviceKey = (typeof DEVICES)[number]["key"];

export default function DeviceFrame({ src }: { src: string }) {
  const [device, setDevice] = useState<DeviceKey>("desktop");
  const current = DEVICES.find((d) => d.key === device)!;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="flex shrink-0 items-center justify-center gap-2 border-b px-4 py-1.5 text-sm"
        style={{ borderColor: "var(--card-border)", background: "var(--bg)" }}
      >
        {DEVICES.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setDevice(d.key)}
            className={`rounded-lg px-3 py-1 ${d.hide}`}
            style={device === d.key ? { background: "var(--accent)", color: "#fff" } : { color: "var(--muted)" }}
          >
            {d.label}
          </button>
        ))}
        {current.width && (
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {current.width}px
          </span>
        )}
      </div>
      <div
        className="min-h-0 flex-1"
        style={current.width ? { background: "color-mix(in srgb, var(--fg) 8%, var(--bg))" } : undefined}
      >
        <iframe
          src={src}
          title="方案预览"
          className={`mx-auto block h-full ${current.width ? "border-x" : "border-0"}`}
          style={{ width: current.width ?? "100%", maxWidth: "100%", borderColor: "var(--card-border)" }}
        />
      </div>
    </div>
  );
}
