// 方案预览:管理员按游客端原样整页渲染任意方案,不影响线上(design/05)。
// 位于 /admin 下受 middleware 保护,但不套管理台外壳;?frame=1 输出裸内容供三端 iframe 使用。
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, homepageConfigs } from "@/db";
import { homepageConfigSchema } from "@/lib/homepage-config";
import { buildHomepageData } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { BackgroundRenderer } from "@/components/backgrounds";
import CardWall from "@/components/cards/CardWall";
import SiteHeader from "@/components/SiteHeader";
import DeviceFrame from "./DeviceFrame";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const row = db.select().from(homepageConfigs).where(eq(homepageConfigs.id, id)).get();
  if (!row) notFound();

  const config = (() => {
    try {
      return homepageConfigSchema.parse(JSON.parse(row.data));
    } catch {
      return null;
    }
  })();
  if (!config) notFound();

  // 裸内容模式:游客端原样渲染,供外层 iframe 定宽模拟三端
  if ((await searchParams).frame !== undefined) {
    const data = buildHomepageData(config);
    const site = getSiteSettings();
    return (
      <div className="flex min-h-dvh flex-col">
        <BackgroundRenderer background={config.background} />
        {config.customCss && <style dangerouslySetInnerHTML={{ __html: config.customCss }} />}
        <SiteHeader site={site} header={config.header} />
        <main className="flex-1 px-4 pb-10">
          <CardWall data={data} site={site} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <div
        className="flex shrink-0 items-center gap-4 px-4 py-2 text-sm text-white"
        style={{ background: "var(--accent)" }}
      >
        <span>
          预览 · {row.name}
          {row.isActive === 1 ? "(启用中)" : "(未启用,不影响线上)"}
        </span>
        <Link href={`/admin/homepage/edit/${row.id}`} className="underline underline-offset-4">
          去编辑
        </Link>
        <Link href="/admin/homepage" className="underline underline-offset-4">
          方案列表
        </Link>
      </div>
      <DeviceFrame src={`/admin/preview/${row.id}?frame=1`} />
    </div>
  );
}
