// 数据表定义(design/02)。所有时间戳为 Unix 秒。
// posts_fts 虚拟表与触发器不在此定义,见 drizzle/ 中的自定义迁移。
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable(
  "posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    coverUrl: text("cover_url"),
    contentMd: text("content_md").notNull().default(""),
    contentHtml: text("content_html").notNull().default(""),
    contentText: text("content_text").notNull().default(""),
    // 保存时提取的目录,JSON:[{ depth, id, text }]
    toc: text("toc").notNull().default("[]"),
    needsKatex: integer("needs_katex").notNull().default(0),
    // JSON 字符串数组
    tags: text("tags").notNull().default("[]"),
    status: text("status", { enum: ["draft", "published"] })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("idx_posts_status_updated").on(t.status, t.updatedAt)],
);

export const comments = sqliteTable(
  "comments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    // 身份判定以 GitHub 数字 ID 为准;login/avatar 是展示用快照
    githubId: text("github_id").notNull(),
    githubLogin: text("github_login").notNull(),
    avatarUrl: text("avatar_url").notNull().default(""),
    body: text("body").notNull(),
    hidden: integer("hidden").notNull().default(0),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("idx_comments_post_created").on(t.postId, t.createdAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  // JSON 文本
  value: text("value").notNull(),
});

export const homepageConfigs = sqliteTable("homepage_configs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  // 完整主页配置 JSON,结构见 design/09 与 src/lib/homepage-config.ts
  data: text("data").notNull(),
  isActive: integer("is_active").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});

export type PostRow = typeof posts.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;
export type HomepageConfigRow = typeof homepageConfigs.$inferSelect;
