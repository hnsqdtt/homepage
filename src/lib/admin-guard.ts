// 管理接口的防御性二次校验:middleware 已按白名单拦截 /api/admin/**,
// 此处兜底 matcher 疏漏,同样以 404 掩盖存在感。
import { auth } from "@/auth";
import { jsonError } from "./api-utils";

export async function requireAdmin() {
  // 本地开发旁路:与 middleware 同一开关(仅 development 构建可达,生产无效)
  if (process.env.NODE_ENV === "development" && process.env.DEV_ADMIN === "1") {
    return { session: null, deny: null } as const;
  }
  const session = await auth();
  if (!session?.isAdmin) {
    return { session: null, deny: jsonError("Not Found", 404) } as const;
  }
  return { session, deny: null } as const;
}
