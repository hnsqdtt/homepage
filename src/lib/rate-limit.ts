// 进程内固定窗口限流:单进程部署,内存 Map 即可(design/06)。
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** 命中限额返回 false;key 需自带业务前缀避免碰撞 */
export function rateLimit(key: string, limit: number, windowSec: number): boolean {
  const now = Date.now();
  // 惰性清理:Map 过大时全扫一遍过期项
  if (buckets.size > 10_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** 评论限流:每用户 1 条/30 秒 且 20 条/天 */
export function allowComment(githubId: string): boolean {
  // 两个窗口都要通过;注意先查日限再占用短窗,避免短窗白扣
  if (!rateLimit(`c:day:${githubId}`, 20, 86_400)) return false;
  return rateLimit(`c:30s:${githubId}`, 1, 30);
}

/** 搜索限流:按 IP 宽松,60 次/分钟 */
export function allowSearch(ip: string): boolean {
  return rateLimit(`s:${ip}`, 60, 60);
}
