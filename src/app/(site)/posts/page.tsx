// 全部文章:ISR 静态页;全量元信息一次下发,筛选/排序/视图切换在客户端就地完成(design/04)。
import type { Metadata } from "next";
import { getArchiveList } from "@/lib/data";
import PostsExplorer from "./PostsExplorer";

// 兜底重验证;正常路径是发布/下线文章时 revalidatePath("/posts")
export const revalidate = 300;

export const metadata: Metadata = { title: "全部文章" };

export default function PostsPage() {
  const posts = getArchiveList();
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <PostsExplorer posts={posts} />
    </div>
  );
}
