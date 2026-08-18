"use client";
// 列表行操作:发布/下线/查看/删除。
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PostRowActions({
  id,
  status,
  slug,
}: {
  id: number;
  status: string;
  slug: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleStatus() {
    setBusy(true);
    try {
      await fetch(`/api/admin/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "published" ? "draft" : "published" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("删除后不可恢复(评论一并删除),确定?")) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/posts/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const linkCls = "text-xs hover:opacity-75 disabled:opacity-40";
  return (
    <span className="flex items-center justify-end gap-3">
      <button type="button" onClick={toggleStatus} disabled={busy} className={linkCls} style={{ color: "var(--accent)" }}>
        {status === "published" ? "下线" : "发布"}
      </button>
      {status === "published" && (
        <a href={`/posts/${slug}`} target="_blank" className={linkCls} style={{ color: "var(--muted)" }}>
          查看
        </a>
      )}
      <button type="button" onClick={remove} disabled={busy} className={`${linkCls} text-red-500`}>
        删除
      </button>
    </span>
  );
}
