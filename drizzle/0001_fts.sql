-- 全文搜索:FTS5 external content 模式,trigram 分词(design/02)。
-- 只索引已发布文章;草稿不可被搜到。触发器负责与 posts 表保持同步。
CREATE VIRTUAL TABLE `posts_fts` USING fts5(
  `title`, `summary`, `content_text`,
  content='posts', content_rowid='id',
  tokenize='trigram'
);
--> statement-breakpoint
CREATE TRIGGER `posts_fts_ai` AFTER INSERT ON `posts` WHEN new.`status` = 'published' BEGIN
  INSERT INTO `posts_fts`(rowid, `title`, `summary`, `content_text`)
  VALUES (new.`id`, new.`title`, new.`summary`, new.`content_text`);
END;
--> statement-breakpoint
CREATE TRIGGER `posts_fts_ad` AFTER DELETE ON `posts` WHEN old.`status` = 'published' BEGIN
  INSERT INTO `posts_fts`(`posts_fts`, rowid, `title`, `summary`, `content_text`)
  VALUES ('delete', old.`id`, old.`title`, old.`summary`, old.`content_text`);
END;
--> statement-breakpoint
CREATE TRIGGER `posts_fts_au` AFTER UPDATE ON `posts` BEGIN
  INSERT INTO `posts_fts`(`posts_fts`, rowid, `title`, `summary`, `content_text`)
  SELECT 'delete', old.`id`, old.`title`, old.`summary`, old.`content_text`
  WHERE old.`status` = 'published';
  INSERT INTO `posts_fts`(rowid, `title`, `summary`, `content_text`)
  SELECT new.`id`, new.`title`, new.`summary`, new.`content_text`
  WHERE new.`status` = 'published';
END;
