// 文章列表:全部文章含草稿,快捷发布/下线/删除(design/05)。
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db, posts } from "@/db";
import PostRowActions from "./PostRowActions";

export default function AdminPostsPage() {
  const list = db
    .select({
      id: posts.id,
      slug: posts.slug,
      title: posts.title,
      status: posts.status,
      updatedAt: posts.updatedAt,
    })
    .from(posts)
    .orderBy(desc(posts.updatedAt))
    .all();

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">文章({list.length})</h1>
        <Link
          href="/admin/posts/new"
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          写新文章
        </Link>
      </div>

      <div className="card-surface overflow-x-auto" data-shadow="none">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
              <th className="px-4 py-2.5 font-medium">标题</th>
              <th className="px-4 py-2.5 font-medium">状态</th>
              <th className="px-4 py-2.5 font-medium">更新时间</th>
              <th className="px-4 py-2.5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-b last:border-0" style={{ borderColor: "var(--card-border)" }}>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/posts/${p.id}`} className="font-medium hover:opacity-75">
                    {p.title}
                  </Link>
                  <span className="ml-2 text-xs" style={{ color: "var(--muted)" }}>
                    /{p.slug}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  {p.status === "published" ? (
                    <span className="text-green-600 dark:text-green-400">已发布</span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>草稿</span>
                  )}
                </td>
                <td className="px-4 py-2.5" style={{ color: "var(--muted)" }}>
                  {new Date(p.updatedAt * 1000).toLocaleString("zh-CN")}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <PostRowActions id={p.id} status={p.status} slug={p.slug} />
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center" style={{ color: "var(--muted)" }}>
                  还没有文章,点右上角开始写作
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
