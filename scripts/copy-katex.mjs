// 把 KaTeX 样式与字体拷进 public/katex,自托管、仅含公式的文章页加载(design/03)。
// dev 与 build 前各跑一次,产物不进 git。
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const katexDist = dirname(require.resolve("katex/dist/katex.min.css"));
const dest = join(root, "public", "katex");

mkdirSync(dest, { recursive: true });
cpSync(join(katexDist, "katex.min.css"), join(dest, "katex.min.css"));
cpSync(join(katexDist, "fonts"), join(dest, "fonts"), { recursive: true });
if (!existsSync(join(dest, "katex.min.css"))) {
  console.error("copy-katex: 拷贝失败");
  process.exit(1);
}
console.log("copy-katex: public/katex 就绪");
