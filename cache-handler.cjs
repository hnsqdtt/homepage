// ISR 磁盘缓存定制(仅生产启用,见 next.config.ts):404 页面条目不写盘。
// Next 对按需渲染的 404(如扫描不存在的文章 slug)同样落盘且无回收机制,可被恶意扫描灌盘;
// 在写入口丢弃 404 条目即可——404 响应照常返回,已发布文章的 200 条目读写不受影响。
const FileSystemCache = require("next/dist/server/lib/incremental-cache/file-system-cache").default;

module.exports = class CacheHandler extends FileSystemCache {
  async set(key, data, ctx) {
    if (data && data.kind === "APP_PAGE" && data.status === 404) return;
    return super.set(key, data, ctx);
  }
};
