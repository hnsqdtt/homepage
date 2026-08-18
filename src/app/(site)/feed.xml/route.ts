// RSS(design/04):静态化 + 定期重验证。
import { getPublishedMetaList } from "@/lib/data";
import { getSiteSettings } from "@/lib/site-settings";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const site = getSiteSettings();
  const items = getPublishedMetaList(50);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="/feed.xsl"?>
<rss version="2.0">
<channel>
  <title>${esc(site.title)}</title>
  <link>${SITE_URL}</link>
  <description>${esc(site.bio || site.name)}</description>
  <language>zh-cn</language>
${items
  .map(
    (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE_URL}/posts/${encodeURIComponent(p.slug)}</link>
    <guid>${SITE_URL}/posts/${encodeURIComponent(p.slug)}</guid>
    <description>${esc(p.summary)}</description>
    <pubDate>${new Date(p.createdAt * 1000).toUTCString()}</pubDate>
  </item>`,
  )
  .join("\n")}
</channel>
</rss>`;
  // application/xml 而非 application/rss+xml:浏览器才会按 XML 文档渲染并应用 feed.xsl,
  // 订阅器不看这个头(自动发现走 <link type="application/rss+xml">,不受影响)
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
