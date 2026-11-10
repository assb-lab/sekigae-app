// 初期読み込み（index.html から参照される JS / modulepreload）の gzip サイズ予算をチェックする。
// XLSX / PPTX ライブラリが初期読み込みに含まれていないことも確認する。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = Number(process.env.BUNDLE_BUDGET_KB ?? 380);
const dist = new URL("../dist/", import.meta.url).pathname;
const html = readFileSync(join(dist, "index.html"), "utf8");
const files = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
let total = 0;
for (const f of new Set(files)) {
  const kb = gzipSync(readFileSync(join(dist, f))).length / 1024;
  total += kb;
  console.log(`${kb.toFixed(1).padStart(7)} KB  ${f}`);
  if (/exceljs|pptxgen/.test(f)) {
    console.error(`✗ ${f} must be lazy-loaded`);
    process.exit(1);
  }
}
console.log(`${total.toFixed(1).padStart(7)} KB  total initial JS (gzip), budget ${BUDGET_KB} KB`);
if (total > BUDGET_KB) {
  console.error("✗ bundle budget exceeded");
  process.exit(1);
}
