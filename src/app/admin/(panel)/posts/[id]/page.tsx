import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, posts } from "@/db";
import PostEditor from "../PostEditor";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const post = db.select().from(posts).where(eq(posts.id, id)).get();
  if (!post) notFound();

  return (
    <PostEditor
      initial={{
        id: post.id,
        slug: post.slug,
        title: post.title,
        summary: post.summary,
        coverUrl: post.coverUrl,
        contentMd: post.contentMd,
        tags: JSON.parse(post.tags) as string[],
        status: post.status,
        createdAt: post.createdAt,
      }}
    />
  );
}
