// 首页卡片墙:整页 ISR 静态化;配置或文章变更时由管理台主动 revalidate(design/04)。
import type { Metadata } from "next";
import { buildHomepageData } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { BackgroundRenderer } from "@/components/backgrounds";
import CardWall from "@/components/cards/CardWall";

// 兜底重验证周期;正常路径是保存/启用时 revalidatePath("/")
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const site = getSiteSettings();
  return {
    title: site.title,
    description: site.bio || site.name,
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
  };
}

export default async function HomePage() {
  const data = buildHomepageData();
  const { config } = data;
  return (
    <>
      <BackgroundRenderer background={config.background} />
      {config.customCss && (
        // 自定义 CSS 逃生门:仅管理员可写(design/09)
        <style dangerouslySetInnerHTML={{ __html: config.customCss }} />
      )}
      <div className="px-4 pb-10">
        {config.searchBox.position === "top" && (
          <form action="/search" className="mx-auto mb-6 mt-2 w-full max-w-xl">
            <input
              type="search"
              name="q"
              placeholder="搜索文章…"
              className="card-surface w-full px-4 py-2.5 text-sm outline-none"
              data-shadow="soft"
            />
          </form>
        )}
        <CardWall data={data} />
      </div>
    </>
  );
}
