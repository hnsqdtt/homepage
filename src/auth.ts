// Auth.js v5 + GitHub OAuth,JWT 会话(design/06)。
// 管理员 = GitHub 数字 ID 命中 ADMIN_GITHUB_ID,全站无密码系统。
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
  interface Session {
    githubId?: string;
    githubLogin?: string;
    isAdmin?: boolean;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    jwt({ token, profile }) {
      // 仅首次登录携带 profile,身份快照写入 token
      if (profile) {
        token.githubId = String(profile.id);
        token.githubLogin = String(profile.login ?? "");
        token.picture = typeof profile.avatar_url === "string" ? profile.avatar_url : token.picture;
      }
      return token;
    },
    session({ session, token }) {
      session.githubId = token.githubId as string | undefined;
      session.githubLogin = token.githubLogin as string | undefined;
      session.isAdmin =
        !!session.githubId && session.githubId === process.env.ADMIN_GITHUB_ID;
      return session;
    },
  },
});
