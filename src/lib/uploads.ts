// 图片上传(design/03):MIME 白名单 → sharp 重编码(天然清洗)→
// 内容 hash 命名(去重 + immutable 缓存)→ 480/960/1600 三档 webp。
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { UPLOADS_DIR } from "./env";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

export interface UploadResult {
  url: string;
  width: number;
  height: number;
}

export async function saveImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("不支持的图片类型");

  const input = Buffer.from(await file.arrayBuffer());
  const sharp = (await import("sharp")).default;

  // gif 按动图处理保留动画;其余静态重编码
  const animated = file.type === "image/gif";
  const meta = await sharp(input, { animated }).metadata();
  if (!meta.width || !meta.height) throw new Error("无法解析图片");

  const hash = createHash("sha256").update(input).digest("hex").slice(0, 16);
  const now = new Date();
  const subdir = path.join(
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  const dir = path.join(UPLOADS_DIR, subdir);
  fs.mkdirSync(dir, { recursive: true });

  const mainPath = path.join(dir, `${hash}.webp`);
  const url = `/uploads/${subdir.replaceAll(path.sep, "/")}/${hash}.webp`;

  // 内容 hash 命名天然去重:已存在直接复用
  if (!fs.existsSync(mainPath)) {
    const encode = (width: number, dest: string) =>
      sharp(input, { animated })
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(dest);
    // 串行处理控制内存峰值(design/08)
    await encode(1600, mainPath);
    await encode(960, path.join(dir, `${hash}-960.webp`));
    await encode(480, path.join(dir, `${hash}-480.webp`));
  }

  const out = await sharp(mainPath).metadata();
  return { url, width: out.width ?? meta.width, height: out.height ?? meta.height };
}

export interface UploadEntry {
  url: string;
  size: number;
  mtime: number;
}

/** 图库列表:只列主文件(-480/-960 变体隐藏),修改时间倒序 */
export function listUploads(): UploadEntry[] {
  const out: UploadEntry[] = [];
  const walk = (dir: string, rel: string) => {
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(abs, r);
      else if (!/-(480|960)\.\w+$/.test(e.name) && e.name !== ".gitkeep") {
        const st = fs.statSync(abs);
        out.push({ url: `/uploads/${r}`, size: st.size, mtime: Math.floor(st.mtimeMs / 1000) });
      }
    }
  };
  walk(UPLOADS_DIR, "");
  return out.sort((a, b) => b.mtime - a.mtime);
}

/** 删除主文件及其尺寸变体;路径穿越防护 */
export function deleteUpload(url: string): boolean {
  if (!url.startsWith("/uploads/")) return false;
  const rel = path.normalize(url.slice("/uploads/".length));
  const abs = path.join(UPLOADS_DIR, rel);
  if (!abs.startsWith(UPLOADS_DIR + path.sep)) return false;
  if (!fs.existsSync(abs)) return false;
  fs.rmSync(abs);
  const ext = path.extname(abs);
  const base = abs.slice(0, -ext.length);
  for (const v of [`${base}-480${ext}`, `${base}-960${ext}`]) {
    if (fs.existsSync(v)) fs.rmSync(v);
  }
  return true;
}
