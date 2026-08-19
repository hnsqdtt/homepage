// 可视化主页编辑器入口(design/05);id 为 "new" 时是未落库草稿,首次保存才创建。
import HomepageEditor from "@/components/admin/homepage-editor/HomepageEditor";

export default async function HomepageEditPage({ params }: { params: Promise<{ id: string }> }) {
  const raw = (await params).id;
  return <HomepageEditor configId={raw === "new" ? null : Number(raw)} />;
}
