// 资产库(design/03/05):文件按内容 hash 落盘,URL 即稳定标识、永不变;
// 分类(folder)只是 assets 表上的逻辑标签,移动分类不动文件,既有引用永不断。
// 图片经 sharp 重编码 + 480/960/1600 三档 webp;其余白名单类型原样存储。
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { desc, eq, inArray, like, or } from "drizzle-orm";
import { assets, db, homepageConfigs, posts, settings, type AssetRow } from "@/db";
import { UPLOADS_DIR } from "./env";
import { ASSET_MIME_BY_EXT } from "./mime";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

// 原样存储的上传白名单(扩展名判定:浏览器给的 file.type 不可靠,woff2 常为空)。
// svg 保留矢量不进 sharp 管线,但登记为图片资产;视频暂无需求不收(design/03);
// MIME 值统一取自 lib/mime.ts。
const UPLOAD_FILE_EXTS = new Set([".svg", ".css", ".woff2", ".ttf", ".otf", ".pdf", ".json", ".txt", ".zip"]);

function now() {
  return Math.floor(Date.now() / 1000);
}

/** 内容 hash 定位存储路径;文件已存在则直接复用(天然去重) */
function hashedTarget(input: Buffer, ext: string): { abs: string; url: string; dir: string } {
  const hash = createHash("sha256").update(input).digest("hex").slice(0, 16);
  const d = new Date();
  const subdir = path.join(String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, "0"));
  const dir = path.join(UPLOADS_DIR, subdir);
  return {
    dir,
    abs: path.join(dir, `${hash}${ext}`),
    url: `/uploads/${subdir.replaceAll(path.sep, "/")}/${hash}${ext}`,
  };
}

/** 入库:同内容重传时更新展示名与分类(URL 冲突即同一份文件) */
function upsertAsset(row: Omit<AssetRow, "id">): AssetRow {
  return db
    .insert(assets)
    .values(row)
    .onConflictDoUpdate({
      target: assets.url,
      set: { name: row.name, folder: row.folder },
    })
    .returning()
    .get();
}

export async function saveImage(file: File, folder: string | null = null): Promise<AssetRow> {
  if (!IMAGE_TYPES.has(file.type)) throw new Error("不支持的图片类型");

  const input = Buffer.from(await file.arrayBuffer());
  const sharp = (await import("sharp")).default;

  // gif 按动图处理保留动画;其余静态重编码
  const animated = file.type === "image/gif";
  const meta = await sharp(input, { animated }).metadata();
  if (!meta.width || !meta.height) throw new Error("无法解析图片");

  const { dir, abs, url } = hashedTarget(input, ".webp");
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(abs)) {
    const encode = (width: number, dest: string) =>
      sharp(input, { animated })
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(dest);
    // 串行处理控制内存峰值(design/08)
    await encode(1600, abs);
    await encode(960, variantPath(abs, 960));
    await encode(480, variantPath(abs, 480));
  }

  const out = await sharp(abs).metadata();
  return upsertAsset({
    url,
    kind: "image",
    mime: "image/webp",
    name: file.name || path.basename(url),
    folder,
    width: out.width ?? meta.width,
    height: out.height ?? meta.height,
    size: fs.statSync(abs).size,
    createdAt: now(),
  });
}

export async function saveFile(file: File, folder: string | null = null): Promise<AssetRow> {
  const ext = path.extname(file.name).toLowerCase();
  const mime = UPLOAD_FILE_EXTS.has(ext) ? ASSET_MIME_BY_EXT[ext] : undefined;
  if (!mime) throw new Error(`不支持的文件类型(${ext || "无扩展名"})`);

  const input = Buffer.from(await file.arrayBuffer());
  const { dir, abs, url } = hashedTarget(input, ext);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(abs)) fs.writeFileSync(abs, input);

  // svg 登记为图片资产(可被插图/背景等选择),宽高尽力解析
  const isSvg = ext === ".svg";
  let width: number | null = null;
  let height: number | null = null;
  if (isSvg) {
    try {
      const sharp = (await import("sharp")).default;
      const m = await sharp(input).metadata();
      width = m.width ?? null;
      height = m.height ?? null;
    } catch {}
  }

  return upsertAsset({
    url,
    kind: isSvg ? "image" : "file",
    mime,
    name: file.name,
    folder,
    width,
    height,
    size: input.byteLength,
    createdAt: now(),
  });
}

/** 上传入口:按类型分流(图片管线 / 原样存储) */
export function saveUpload(file: File, folder: string | null = null): Promise<AssetRow> {
  return IMAGE_TYPES.has(file.type) ? saveImage(file, folder) : saveFile(file, folder);
}

const VARIANT_RE = /-(480|960)\.\w+$/;

function variantPath(abs: string, width: number): string {
  const ext = path.extname(abs);
  return `${abs.slice(0, -ext.length)}-${width}${ext}`;
}

/** 扫盘对账:盘上有表里无的收编(手工拷入/历史存量),表里有盘上无的清行 */
async function reconcile(): Promise<void> {
  const onDisk = new Map<string, { abs: string; size: number; mtime: number }>();
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
      else if (!VARIANT_RE.test(e.name) && e.name !== ".gitkeep") {
        const st = fs.statSync(abs);
        onDisk.set(`/uploads/${r}`, { abs, size: st.size, mtime: Math.floor(st.mtimeMs / 1000) });
      }
    }
  };
  walk(UPLOADS_DIR, "");

  const known = new Set(db.select({ url: assets.url }).from(assets).all().map((r) => r.url));

  const missing = [...onDisk].filter(([url]) => !known.has(url));
  for (const [url, f] of missing) {
    const ext = path.extname(url).toLowerCase();
    const isImage = ext === ".webp" || ext === ".svg"; // 图片管线主文件为 webp;svg 原样存
    let width: number | null = null;
    let height: number | null = null;
    if (isImage) {
      try {
        const sharp = (await import("sharp")).default;
        const m = await sharp(f.abs).metadata();
        width = m.width ?? null;
        height = m.height ?? null;
      } catch {}
    }
    upsertAsset({
      url,
      kind: isImage ? "image" : "file",
      mime: isImage ? "image/webp" : (ASSET_MIME_BY_EXT[ext] ?? "application/octet-stream"),
      name: path.basename(url),
      folder: null,
      width,
      height,
      size: f.size,
      createdAt: f.mtime,
    });
  }

  const gone = [...known].filter((url) => !onDisk.has(url));
  if (gone.length > 0) db.delete(assets).where(inArray(assets.url, gone)).run();
}

/** 资产全量列表(倒序);先对账,盘面是事实源 */
export async function listAssets(): Promise<AssetRow[]> {
  await reconcile();
  return db.select().from(assets).orderBy(desc(assets.createdAt), desc(assets.id)).all();
}

export function moveAssets(urls: string[], folder: string | null): void {
  if (urls.length === 0) return;
  db.update(assets).set({ folder }).where(inArray(assets.url, urls)).run();
}

/** 重命名分类;to 传 null 即解散(资产回到未分类) */
export function renameFolder(from: string, to: string | null): void {
  db.update(assets).set({ folder: to }).where(eq(assets.folder, from)).run();
}

export interface AssetRefs {
  posts: { id: number; title: string }[];
  configs: { id: number; name: string }[];
  settingKeys: string[];
  total: number;
}

/** 引用检查:管理台删除前调用(低频操作,LIKE 扫描可接受,不碰游客热路径) */
export function findAssetRefs(url: string): AssetRefs {
  const pat = `%${url}%`;
  const p = db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(or(like(posts.contentMd, pat), eq(posts.coverUrl, url)))
    .all();
  const c = db
    .select({ id: homepageConfigs.id, name: homepageConfigs.name })
    .from(homepageConfigs)
    .where(like(homepageConfigs.data, pat))
    .all();
  const s = db
    .select({ key: settings.key })
    .from(settings)
    .where(like(settings.value, pat))
    .all();
  return {
    posts: p,
    configs: c,
    settingKeys: s.map((r) => r.key),
    total: p.length + c.length + s.length,
  };
}

/** 删除主文件、尺寸变体与表行;路径穿越防护 */
export function deleteAsset(url: string): boolean {
  if (!url.startsWith("/uploads/")) return false;
  const rel = path.normalize(url.slice("/uploads/".length));
  const abs = path.join(UPLOADS_DIR, rel);
  if (!abs.startsWith(UPLOADS_DIR + path.sep)) return false;

  const removed = db.delete(assets).where(eq(assets.url, url)).returning().all().length > 0;
  if (!fs.existsSync(abs)) return removed;
  fs.rmSync(abs);
  for (const v of [variantPath(abs, 480), variantPath(abs, 960)]) {
    if (fs.existsSync(v)) fs.rmSync(v);
  }
  return true;
}
