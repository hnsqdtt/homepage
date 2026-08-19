// 资产扩展名 → MIME:上传白名单与 /uploads 兜底路由共用(零依赖,热路径可安全引用)。
export const ASSET_MIME_BY_EXT: Record<string, string> = {
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".css": "text/css",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".txt": "text/plain",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};
