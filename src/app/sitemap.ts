import type { MetadataRoute } from "next";
import { getPublishedMetaList } from "@/lib/data";
import { SITE_URL } from "@/lib/env";

export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getPublishedMetaList().map((p) => ({
    url: `${SITE_URL}/posts/${encodeURIComponent(p.slug)}`,
    lastModified: new Date(p.updatedAt * 1000),
  }));
  return [{ url: SITE_URL, lastModified: new Date() }, ...posts];
}
