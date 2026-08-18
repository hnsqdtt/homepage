// 编辑器路由组:全宽双栏工作台,视口固定,画布与侧栏各自滚动(不套管理台外壳)。
export const dynamic = "force-dynamic";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-dvh w-full flex-col overflow-hidden p-4">{children}</div>;
}
