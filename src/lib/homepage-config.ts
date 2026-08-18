// 主页配置:结构与默认值(design/09)。
// zod 校验只发生在管理台写入口;游客端渲染直接信任已存 JSON(热路径零校验,design/08)。
import { z } from "zod";

/** 单卡样式覆盖:全局主题的子集 */
export const styleOverrideSchema = z
  .object({
    surface: z.enum(["solid", "glass"]).optional(),
    opacity: z.number().min(0).max(1).optional(),
    blurPx: z.number().min(0).max(40).optional(),
    radius: z.number().min(0).max(48).optional(),
    borderWidth: z.number().min(0).max(8).optional(),
    shadow: z.enum(["none", "soft"]).optional(),
    titleColor: z.string().optional(),
    titleSize: z.number().min(10).max(48).optional(),
  })
  .strict();

export const carouselSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("latest"), n: z.number().int().min(1).max(20) }),
  z.object({ kind: z.literal("tag"), tag: z.string(), n: z.number().int().min(1).max(20) }),
]);

export const cardSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    title: z.string(),
    body: z.string().optional(),
    href: z.string().optional(),
  }),
  z.object({
    type: z.literal("image"),
    src: z.string(),
    title: z.string().optional(),
    href: z.string().optional(),
  }),
  z.object({ type: z.literal("post"), slug: z.string() }),
  z.object({
    type: z.literal("carousel"),
    source: carouselSourceSchema.optional(),
    slides: z
      .array(
        z.object({
          image: z.string().optional(),
          title: z.string(),
          text: z.string().optional(),
          href: z.string().optional(),
        }),
      )
      .optional(),
    intervalSec: z.number().min(2).max(60).default(6),
  }),
  z.object({ type: z.literal("widget"), widget: z.enum(["profile", "links"]) }),
]);

export const layoutItemSchema = z.object({
  id: z.string(),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  card: cardSchema,
  styleOverride: styleOverrideSchema.optional(),
});

export const backgroundSchema = z.object({
  engine: z.enum(["none", "color", "gradient", "image"]),
  // 各引擎参数自带亮暗两套取色(design/04)
  params: z.record(z.string(), z.unknown()).prefault({}),
  dim: z.number().min(0).max(0.8).default(0),
  disableOnMobile: z.boolean().default(false),
});

export const homepageConfigSchema = z.object({
  layout: z.object({
    cols: z
      .object({
        desktop: z.number().int().default(12),
        tablet: z.number().int().default(8),
        mobile: z.number().int().default(4),
      })
      .default({ desktop: 12, tablet: 8, mobile: 4 }),
    items: z.array(layoutItemSchema).default([]),
    // 未上墙的已发布文章自动以 post 卡续排
    autoFlow: z
      .object({
        unplacedPosts: z.enum(["append", "none"]).default("append"),
        cardType: z.literal("post").default("post"),
      })
      .default({ unplacedPosts: "append", cardType: "post" }),
  }),
  theme: z
    .object({
      card: z
        .object({
          surface: z.enum(["solid", "glass"]).default("solid"),
          opacity: z.number().min(0).max(1).default(0.92),
          blurPx: z.number().min(0).max(40).default(12),
          radius: z.number().min(0).max(48).default(16),
          borderWidth: z.number().min(0).max(8).default(1),
          shadow: z.enum(["none", "soft"]).default("soft"),
        })
        .prefault({}),
      title: z
        .object({
          size: z.number().min(10).max(48).default(18),
          weight: z.number().min(300).max(900).default(600),
          color: z.string().nullable().default(null),
        })
        .prefault({}),
      accent: z.string().default("#7F77DD"),
      pageMaxWidth: z.number().min(640).max(1920).default(1200),
    })
    .prefault({}),
  background: backgroundSchema.default({ engine: "none", params: {}, dim: 0, disableOnMobile: false }),
  searchBox: z
    .object({ position: z.enum(["top", "header", "hidden"]).default("top") })
    .default({ position: "top" }),
  // 站头:站点名 + 导航 + 暗色切换的简单形态(原"待定"已拍板,见 design/09)
  header: z
    .object({
      show: z.boolean().default(true),
      showNav: z.boolean().default(true),
      showThemeToggle: z.boolean().default(true),
    })
    .prefault({}),
  customCss: z.string().default(""),
});

export type HomepageConfig = z.infer<typeof homepageConfigSchema>;
export type LayoutItem = z.infer<typeof layoutItemSchema>;
export type CardConfig = z.infer<typeof cardSchema>;
export type StyleOverride = z.infer<typeof styleOverrideSchema>;

/** 全新站点的默认主页:profile 卡 + 自动续排的最新文章 */
export const DEFAULT_HOMEPAGE_CONFIG: HomepageConfig = homepageConfigSchema.parse({
  layout: {
    items: [
      {
        id: "profile",
        x: 0,
        y: 0,
        w: 4,
        h: 2,
        card: { type: "widget", widget: "profile" },
      },
      {
        id: "welcome",
        x: 4,
        y: 0,
        w: 8,
        h: 2,
        card: {
          type: "text",
          title: "欢迎",
          body: "站点已就绪。到 /admin 写下第一篇文章,它会自动出现在这面卡片墙上。",
        },
      },
    ],
  },
});
