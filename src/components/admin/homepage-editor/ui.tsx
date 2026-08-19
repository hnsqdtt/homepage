"use client";
// 编辑器基础控件:统一样式的小输入组件,让各表单文件聚焦业务字段。
import { useState } from "react";
import AssetPicker from "@/components/admin/AssetPicker";

export const inputCls = "card-surface w-full px-2.5 py-1.5 text-sm outline-none";

export function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="card-surface p-4" data-shadow="none">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="w-16 shrink-0" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

export function TextField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
      data-shadow="none"
    />
  );
}

export function AreaField({
  value,
  onChange,
  rows = 4,
  mono = false,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  mono?: boolean;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      spellCheck={false}
      placeholder={placeholder}
      className={`${inputCls} resize-y ${mono ? "font-mono text-xs" : ""}`}
      data-shadow="none"
    />
  );
}

export function NumField({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      className={inputCls}
      data-shadow="none"
    />
  );
}

export function RangeField({
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
}) {
  return (
    <span className="flex items-center gap-2">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1"
        style={{ accentColor: "var(--accent)" }}
      />
      <span className="w-11 shrink-0 text-right text-xs tabular-nums" style={{ color: "var(--muted)" }}>
        {format ? format(value) : value}
      </span>
    </span>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
      <span>{label}</span>
    </label>
  );
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls} data-shadow="none">
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

/** 颜色选择:色板 + 文本双输入,非 #rrggbb 值(如 css 颜色名)也可直接手输 */
export function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#888888";
  return (
    <span className="flex items-center gap-2">
      <input
        type="color"
        value={hex}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-9 shrink-0 cursor-pointer rounded border"
        style={{ borderColor: "var(--card-border)", background: "transparent" }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        data-shadow="none"
        placeholder="#rrggbb"
      />
    </span>
  );
}

/** 图片资产字段:URL 文本输入 + 资产库选择(选择器内可就地上传) */
export function AssetField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="flex gap-2">
      <TextField value={value} onChange={onChange} placeholder={placeholder} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="card-surface shrink-0 px-2.5 py-1.5 text-sm hover:opacity-80"
        data-shadow="none"
      >
        选择
      </button>
      {open && (
        <AssetPicker
          kind="image"
          onClose={() => setOpen(false)}
          onSelect={(a) => {
            onChange(a.url);
            setOpen(false);
          }}
        />
      )}
    </span>
  );
}
