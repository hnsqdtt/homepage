// 站点设置:标题/名字/bio/头像/社交链接/页脚(settings.site)。
"use client";
import { useEffect, useState } from "react";
import AssetPicker from "@/components/admin/AssetPicker";

interface Social {
  kind: string;
  url: string;
}

interface SiteForm {
  title: string;
  name: string;
  bio: string;
  avatarUrl: string;
  socials: Social[];
  footerText: string;
}

const inputCls = "card-surface w-full px-3 py-2 text-sm outline-none";

export default function SettingsPage() {
  const [form, setForm] = useState<SiteForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/settings");
      if (res.ok) setForm((await res.json()).settings);
    })();
  }, []);

  if (!form) return <p style={{ color: "var(--muted)" }}>加载中…</p>;

  function patch(p: Partial<SiteForm>) {
    setForm((f) => (f ? { ...f, ...p } : f));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setMessage(res.ok ? "已保存" : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold">站点设置</h1>
      <div className="space-y-4">
        <label className="block text-sm">
          <span style={{ color: "var(--muted)" }}>站点标题(浏览器标签、站头)</span>
          <input value={form.title} onChange={(e) => patch({ title: e.target.value })} className={`${inputCls} mt-1`} data-shadow="none" />
        </label>
        <label className="block text-sm">
          <span style={{ color: "var(--muted)" }}>名字(profile 卡、页脚)</span>
          <input value={form.name} onChange={(e) => patch({ name: e.target.value })} className={`${inputCls} mt-1`} data-shadow="none" />
        </label>
        <label className="block text-sm">
          <span style={{ color: "var(--muted)" }}>bio</span>
          <textarea value={form.bio} onChange={(e) => patch({ bio: e.target.value })} rows={2} className={`${inputCls} mt-1 resize-y`} data-shadow="none" />
        </label>
        <label className="block text-sm">
          <span style={{ color: "var(--muted)" }}>头像 URL(可从资产库选择)</span>
          <span className="mt-1 flex gap-2">
            <input value={form.avatarUrl} onChange={(e) => patch({ avatarUrl: e.target.value })} className={inputCls} data-shadow="none" />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="shrink-0 rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "var(--card-border)" }}
            >
              选择
            </button>
          </span>
        </label>

        <div className="text-sm">
          <span style={{ color: "var(--muted)" }}>社交 / 友链(kind 显示为链接文字)</span>
          <div className="mt-1 space-y-2">
            {form.socials.map((s, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={s.kind}
                  placeholder="GitHub"
                  onChange={(e) =>
                    patch({ socials: form.socials.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)) })
                  }
                  className={`${inputCls} w-32`}
                  data-shadow="none"
                />
                <input
                  value={s.url}
                  placeholder="https://github.com/..."
                  onChange={(e) =>
                    patch({ socials: form.socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })
                  }
                  className={inputCls}
                  data-shadow="none"
                />
                <button
                  type="button"
                  onClick={() => patch({ socials: form.socials.filter((_, j) => j !== i) })}
                  className="shrink-0 text-sm text-red-500 hover:opacity-75"
                >
                  删除
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patch({ socials: [...form.socials, { kind: "", url: "" }] })}
              className="text-sm underline underline-offset-2"
              style={{ color: "var(--accent)" }}
            >
              + 添加一行
            </button>
          </div>
        </div>

        <label className="block text-sm">
          <span style={{ color: "var(--muted)" }}>页脚文字(留空显示默认版权)</span>
          <input value={form.footerText} onChange={(e) => patch({ footerText: e.target.value })} className={`${inputCls} mt-1`} data-shadow="none" />
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--accent)" }}
          >
            保存
          </button>
          <span className="text-sm" style={{ color: "var(--muted)" }}>
            {message}
          </span>
        </div>
      </div>

      {pickerOpen && (
        <AssetPicker
          kind="image"
          onClose={() => setPickerOpen(false)}
          onSelect={(a) => {
            patch({ avatarUrl: a.url });
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}
