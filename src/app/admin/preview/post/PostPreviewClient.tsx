"use client";
// 读编辑器写入 localStorage 的草稿 → 服务端渲染管线出 HTML → 文章页同款组件展示。
import { useEffect, useState } from "react";
import PostArticle, { type PostArticleData } from "@/components/PostArticle";

// 与 PostEditor.openFullPreview 写入的 key 一致
const PREVIEW_STORAGE_KEY = "post-full-preview";

interface Draft {
  title: string;
  tags: string[];
  md: string;
  createdAt: number;
}

export default function PostPreviewClient() {
  const [post, setPost] = useState<PostArticleData | null>(null);
  const [status, setStatus] = useState("渲染中…");

  useEffect(() => {
    void (async () => {
      let draft: Draft | null = null;
      try {
        draft = JSON.parse(localStorage.getItem(PREVIEW_STORAGE_KEY) ?? "null") as Draft | null;
      } catch {}
      if (!draft || typeof draft.md !== "string") {
        setStatus("没有待预览的内容,请从文章编辑器点「整页预览」打开");
        return;
      }
      const res = await fetch("/api/admin/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ md: draft.md }),
      });
      if (!res.ok) {
        setStatus("渲染失败,请回编辑器重试");
        return;
      }
      const r = await res.json();
      setPost({
        title: draft.title || "(无标题)",
        createdAt: draft.createdAt,
        tags: draft.tags,
        html: r.html,
        toc: r.toc,
        needsKatex: r.needsKatex,
      });
    })();
  }, []);

  if (!post) {
    return (
      <p className="px-4 py-16 text-center text-sm" style={{ color: "var(--muted)" }}>
        {status}
      </p>
    );
  }
  return <PostArticle post={post} />;
}
