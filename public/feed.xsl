<?xml version="1.0" encoding="UTF-8"?>
<!-- RSS 订阅源的浏览器展示样式:人点开 /feed.xml 时渲染为说明页,阅读器不受影响(design/04)。
     注:Chrome 计划于 2026 年底移除 XSLT,届时 Chrome 退回显示原始 XML,订阅功能不受任何影响。 -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8"/>
  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> · RSS 订阅源</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          :root { color-scheme: light dark; }
          body {
            margin: 0; padding: 2.5rem 1rem 4rem;
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            background: #f6f6f8; color: #1a1a20; line-height: 1.6;
          }
          .wrap { max-width: 640px; margin: 0 auto; }
          .badge {
            display: inline-block; font-size: .75rem; letter-spacing: .05em;
            padding: .2rem .6rem; border-radius: 999px;
            background: #7f77dd; color: #fff; margin: 0 0 .75rem;
          }
          h1 { margin: 0 0 .25rem; font-size: 1.5rem; }
          .desc { margin: 0; color: #6b6b76; }
          .hint {
            margin: 1.25rem 0 2rem; padding: .9rem 1rem; font-size: .9rem;
            background: #fff; border: 1px solid #e4e4ec; border-radius: 12px; color: #6b6b76;
          }
          .hint code {
            background: rgba(127, 119, 221, .12); padding: .1rem .35rem;
            border-radius: 6px; font-size: .85em; word-break: break-all;
          }
          h2 { font-size: 1.05rem; margin: 0 0 .75rem; }
          ul { list-style: none; margin: 0; padding: 0; }
          li { padding: .8rem 0; border-bottom: 1px solid #e4e4ec; }
          li a { color: inherit; font-weight: 600; text-decoration: none; }
          li a:hover { text-decoration: underline; text-underline-offset: 4px; }
          .date { margin-left: .6rem; font-size: .8rem; color: #6b6b76; white-space: nowrap; }
          li p { margin: .25rem 0 0; font-size: .9rem; color: #6b6b76; }
          .foot { margin-top: 2rem; }
          .foot a { color: #7f77dd; }
          @media (prefers-color-scheme: dark) {
            body { background: #101014; color: #e8e8ee; }
            .desc, .hint, .date, li p { color: #9a9aa8; }
            .hint { background: #18181e; border-color: #2a2a34; }
            li { border-color: #2a2a34; }
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <p class="badge">RSS 订阅源</p>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p class="desc"><xsl:value-of select="/rss/channel/description"/></p>
          <p class="hint">
            这不是普通网页,而是供 RSS 阅读器使用的订阅源。把当前地址
            <code><xsl:value-of select="/rss/channel/link"/>/feed.xml</code>
            添加到 Folo、Feedly、NetNewsWire 等阅读器,新文章发布时会自动送达。
          </p>
          <h2>最近更新</h2>
          <ul>
            <xsl:for-each select="/rss/channel/item">
              <li>
                <a href="{link}"><xsl:value-of select="title"/></a>
                <span class="date"><xsl:value-of select="substring(pubDate, 6, 11)"/></span>
                <xsl:if test="description != ''">
                  <p><xsl:value-of select="description"/></p>
                </xsl:if>
              </li>
            </xsl:for-each>
          </ul>
          <p class="foot"><a href="{/rss/channel/link}">← 返回站点</a></p>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
