// 文章写路径:渲染管线在保存时执行,产物写回 posts;变更后主动 revalidate(design/03)。
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, posts, type PostRow } from "@/db";
import { renderMarkdown } from "./markdown";

export const postInputSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "slug 只能是小写字母、数字与连字符"),
  title: z.string().min(1).max(200),
  summary: z.string().max(500).default(""),
  coverUrl: z.string().max(500).nullable().default(null),
  contentMd: z.string().default(""),
  tags: z.array(z.string().min(1).max(40)).max(20).default([]),
  status: z.enum(["draft", "published"]),
});

export type PostInput = z.infer<typeof postInputSchema>;

function now() {
  return Math.floor(Date.now() / 1000);
}

/** 文章相关页面的缓存失效:文章页 + 首页 + feed + sitemap */
function revalidatePost(slugs: string[]) {
  for (const slug of slugs) revalidatePath(`/posts/${slug}`);
  revalidatePath("/");
  revalidatePath("/feed.xml");
  revalidatePath("/sitemap.xml");
}

export async function createPost(input: PostInput): Promise<PostRow> {
  const exists = db.select({ id: posts.id }).from(posts).where(eq(posts.slug, input.slug)).get();
  if (exists) throw new Error("slug 已存在");

  const r = await renderMarkdown(input.contentMd);
  const t = now();
  const row = db
    .insert(posts)
    .values({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      coverUrl: input.coverUrl,
      contentMd: input.contentMd,
      contentHtml: r.html,
      contentText: r.text,
      toc: JSON.stringify(r.toc),
      needsKatex: r.needsKatex ? 1 : 0,
      tags: JSON.stringify(input.tags),
      status: input.status,
      createdAt: t,
      updatedAt: t,
    })
    .returning()
    .get();
  revalidatePost([row.slug]);
  return row;
}

export async function updatePost(id: number, input: PostInput): Promise<PostRow> {
  const old = db.select().from(posts).where(eq(posts.id, id)).get();
  if (!old) throw new Error("文章不存在");
  if (old.slug !== input.slug) {
    const clash = db.select({ id: posts.id }).from(posts).where(eq(posts.slug, input.slug)).get();
    if (clash) throw new Error("slug 已存在");
  }

  const r = await renderMarkdown(input.contentMd);
  const row = db
    .update(posts)
    .set({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      coverUrl: input.coverUrl,
      contentMd: input.contentMd,
      contentHtml: r.html,
      contentText: r.text,
      toc: JSON.stringify(r.toc),
      needsKatex: r.needsKatex ? 1 : 0,
      tags: JSON.stringify(input.tags),
      status: input.status,
      updatedAt: now(),
    })
    .where(eq(posts.id, id))
    .returning()
    .get();
  revalidatePost(old.slug === row.slug ? [row.slug] : [old.slug, row.slug]);
  return row;
}

/** 删除为硬删(有导出兜底,design/03);评论随外键级联删除 */
export function deletePost(id: number): void {
  const old = db.select({ slug: posts.slug }).from(posts).where(eq(posts.id, id)).get();
  if (!old) return;
  db.delete(posts).where(eq(posts.id, id)).run();
  revalidatePost([old.slug]);
}
