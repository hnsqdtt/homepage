"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ReindexButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/admin/reindex", { method: "POST" });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="rounded px-2 py-1 text-xs text-white disabled:opacity-50"
      style={{ background: "var(--accent)" }}
    >
      {busy ? "重建中…" : "重建索引"}
    </button>
  );
}
