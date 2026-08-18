// 站点信息(settings 表 key='site'):结构、默认值与读取(design/02)。
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, settings } from "@/db";

export const siteSettingsSchema = z.object({
  title: z.string().default("linlang.me"),
  name: z.string().default("linlang"),
  bio: z.string().default(""),
  avatarUrl: z.string().default(""),
  socials: z
    .array(z.object({ kind: z.string(), url: z.string() }))
    .default([]),
  footerText: z.string().default(""),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = siteSettingsSchema.parse({});

export function getSiteSettings(): SiteSettings {
  const row = db.select().from(settings).where(eq(settings.key, "site")).get();
  if (!row) return DEFAULT_SITE_SETTINGS;
  try {
    return siteSettingsSchema.parse(JSON.parse(row.value));
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

export function saveSiteSettings(value: SiteSettings) {
  db.insert(settings)
    .values({ key: "site", value: JSON.stringify(value) })
    .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value) } })
    .run();
}
