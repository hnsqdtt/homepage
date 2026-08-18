// 管理接口的防御性二次校验:middleware 已按白名单拦截 /api/admin/**,
// 此处兜底 matcher 疏漏,同样以 404 掩盖存在感。
import { auth } from "@/auth";
import { jsonError } from "./api-utils";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.isAdmin) {
    return { session: null, deny: jsonError("Not Found", 404) } as const;
  }
  return { session, deny: null } as const;
}
