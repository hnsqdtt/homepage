"use client";
// 编辑器写作帮助弹层:语法速查 + 资产用法 + 快捷键(design/05)。
import { useEffect } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      <div className="space-y-1 text-sm" style={{ color: "var(--muted)" }}>
        {children}
      </div>
    </section>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="rounded px-1 py-0.5 text-xs"
      style={{ background: "var(--card-border)" }}
    >
      {children}
    </code>
  );
}

export default function EditorHelp({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="card-surface flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center border-b px-5 py-3"
          style={{ borderColor: "var(--card-border)" }}
        >
          <h2 className="text-base font-semibold">写作帮助</h2>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto text-sm hover:opacity-75"
            style={{ color: "var(--muted)" }}
          >
            关闭(Esc)
          </button>
        </div>

        <div className="space-y-5 overflow-auto p-5">
          <Section title="插入图片(资产库)">
            <p>三种方式,上传的图都会进资产库(管理台「资产」页,可分类、可被主页背景等复用):</p>
            <p>1. 工具栏「插入图片」——从资产库挑选或就地上传,自动插到光标处;</p>
            <p>2. 把图片直接拖进编辑区,或截图后粘贴——自动上传并插入引用;</p>
            <p>
              3. 手写 <Code>![说明](/uploads/…)</Code>——URL 到「资产」页复制;说明文字会渲染成图注。
            </p>
          </Section>

          <Section title="导入与导出">
            <p>
              工具栏「导入 .md」或把 .md 文件拖进编辑区:frontmatter(title / slug / date /
              tags / summary / cover)自动回填表单,<Code>date</Code> 会保留为文章的原文日期;
              正文没有 frontmatter 时,取开头的一级标题作为文章标题。
            </p>
            <p>「导出」页可把全站文章打包为同格式 .md,与导入互逆。</p>
          </Section>

          <Section title="公式与代码">
            <p>
              行内公式 <Code>$x^2$</Code>,块级公式 <Code>$$…$$</Code>(KaTeX,保存时渲染);
              围栏代码块 <Code>```lang</Code> 自动语法高亮。
            </p>
          </Section>

          <Section title="嵌入交互组件">
            <p>
              <Code>::widget{'{name="counter-demo" step=2}'}</Code> 在正文任意位置嵌入注册过的
              组件(仓库 <Code>src/components/islands/</Code>),游客端进入视口才加载。
            </p>
          </Section>

          <Section title="其他">
            <p>支持 GFM(表格、任务列表、删除线)与内嵌原始 HTML;外链自动新窗口打开。</p>
          </Section>

          <Section title="预览与快捷键">
            <p>
              <Code>Ctrl+Shift+V</Code> 在编辑器内快速切换渲染预览,<Code>Esc</Code>{" "}
              返回编辑;「整页预览」新窗口按文章页发布后的实际样子渲染当前草稿(含站头、
              目录),不会保存任何内容——若点击无反应,检查浏览器是否拦截了弹窗。
            </p>
            <p>
              <Code>Ctrl+S</Code> 保存。
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
