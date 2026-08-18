// 可视化主页编辑器入口(design/05)。
import HomepageEditor from "@/components/admin/homepage-editor/HomepageEditor";

export default async function HomepageEditPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  return <HomepageEditor configId={id} />;
}
