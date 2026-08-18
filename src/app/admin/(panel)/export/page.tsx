// 一键导出:数据主权兜底(design/07)。
export default function ExportPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold">一键导出</h1>
      <div className="card-surface p-5 text-sm leading-relaxed" data-shadow="none">
        <p>打包下载全站数据(zip,流式生成):</p>
        <ul className="mt-2 list-disc space-y-1 pl-5" style={{ color: "var(--muted)" }}>
          <li>posts/&lt;slug&gt;.md —— 全部文章(frontmatter 格式,可直接喂给任何静态博客生成器)</li>
          <li>uploads/ —— 全部图片;pages/ —— 备用静态区(如有)</li>
          <li>comments.json / settings.json / homepage-configs.json</li>
          <li>app.db —— VACUUM INTO 产生的一致性快照</li>
        </ul>
        <p className="mt-3" style={{ color: "var(--muted)" }}>
          导出不含任何凭据(.env 不在数据目录)。
        </p>
        <a
          href="/api/admin/export"
          className="mt-4 inline-block rounded-lg px-4 py-2 font-medium text-white"
          style={{ background: "var(--accent)" }}
        >
          下载导出包
        </a>
      </div>
    </div>
  );
}
