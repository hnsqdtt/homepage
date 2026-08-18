// 一键导出(design/07):流式打包 zip,内存平稳;posts 以 frontmatter Markdown
// 输出,数据不锁死在本方案里。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import archiver from "archiver";
import Database from "better-sqlite3";
import { db, comments, homepageConfigs, posts, settings } from "@/db";
import { DATA_DIR, UPLOADS_DIR } from "./env";

function frontmatter(p: typeof posts.$inferSelect): string {
  const esc = (s: string) => JSON.stringify(s);
  const lines = [
    "---",
    `title: ${esc(p.title)}`,
    `slug: ${esc(p.slug)}`,
    `date: ${new Date(p.createdAt * 1000).toISOString()}`,
    `updated: ${new Date(p.updatedAt * 1000).toISOString()}`,
    `tags: ${p.tags}`,
    `summary: ${esc(p.summary)}`,
    ...(p.coverUrl ? [`cover: ${esc(p.coverUrl)}`] : []),
    `status: ${p.status}`,
    "---",
    "",
  ];
  return lines.join("\n") + p.contentMd + "\n";
}

/** 生成导出 zip 的 Node Readable(archiver);调用方转 Web Stream 响应 */
export function createExportArchive(): {
  archive: archiver.Archiver;
  cleanup: () => void;
} {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const root = `export-${stamp}`;
  const archive = archiver("zip", { zlib: { level: 6 } });

  // 一致性快照:VACUUM INTO 临时文件,打包完成后删除
  const snapshot = path.join(os.tmpdir(), `app-export-${Date.now()}.db`);
  const raw = new Database(path.join(DATA_DIR, "app.db"), { readonly: true });
  raw.exec(`VACUUM INTO '${snapshot.replaceAll("'", "''")}'`);
  raw.close();
  archive.file(snapshot, { name: `${root}/app.db` });

  for (const p of db.select().from(posts).all()) {
    archive.append(frontmatter(p), { name: `${root}/posts/${p.slug}.md` });
  }

  archive.append(JSON.stringify(db.select().from(comments).all(), null, 2), {
    name: `${root}/comments.json`,
  });
  archive.append(JSON.stringify(db.select().from(settings).all(), null, 2), {
    name: `${root}/settings.json`,
  });
  archive.append(JSON.stringify(db.select().from(homepageConfigs).all(), null, 2), {
    name: `${root}/homepage-configs.json`,
  });

  if (fs.existsSync(UPLOADS_DIR)) {
    archive.directory(UPLOADS_DIR, `${root}/uploads`);
  }
  const pagesDir = path.join(DATA_DIR, "pages");
  if (fs.existsSync(pagesDir)) {
    archive.directory(pagesDir, `${root}/pages`);
  }

  void archive.finalize();
  return {
    archive,
    cleanup: () => {
      try {
        fs.rmSync(snapshot, { force: true });
      } catch {}
    },
  };
}
