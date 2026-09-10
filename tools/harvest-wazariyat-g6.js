#!/usr/bin/env node
/**
 * جمع بيانات أوراق الامتحانات الوزارية للسادس العلمي من iraqedu.net.
 *
 * يقرأ قائمة صفحات الأوراق، ويستخرج من كل صفحة روابط صور الورقة،
 * ويفكّ من عنوانها: السنة والدور والمسار والفئة (داخل القطر/خارجه/نازحين).
 *
 * لا يستخرج نص السؤال — الأوراق صور، والاستخراج النصّي مرحلة لاحقة منفصلة.
 *
 * الاستعمال: node tools/harvest-wazariyat-g6.js <exam-pages.txt> <out.json>
 */
const fs = require("fs");
const { execFileSync } = require("child_process");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

function parseMeta(slug) {
  const s = decodeURIComponent(slug);
  const ym = s.match(/\b(20\d{2})\b/) || s.match(/-(\d{2})-/);
  let year = ym ? +ym[1] : null;
  if (year && year < 100) year += 2000;

  let round = null;
  if (/دور-?اول|الدور-الاول|دور-الاول/.test(s)) round = 1;
  else if (/دور-?ثاني|الدور-الثاني|دور-الثاني/.test(s)) round = 2;
  else if (/دور-?ثالث|الدور-الثالث|دور-الثالث/.test(s)) round = 3;
  else if (/تمهيدي/.test(s)) round = 0; // تمهيدي — ليس دوراً رسمياً

  let track = "مشترك";
  if (/احيائي|-ا-م|-ا-خ/.test(s)) track = "احيائي";
  else if (/تطبيقي|-ت-م|-ت-خ/.test(s)) track = "تطبيقي";

  let category = "داخل القطر";
  if (/خ-ق|-خ\b|خارج/.test(s)) category = "خارج القطر";
  else if (/-ن\b|نازح/.test(s)) category = "النازحين";

  return { year, round, track, category, slug: s };
}

const pages = fs.readFileSync(process.argv[2], "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const out = [];
pages.forEach((url, i) => {
  let html = "";
  try {
    html = execFileSync("curl", ["-sL", "-A", UA, "--max-time", "30", url], { encoding: "utf8", maxBuffer: 40e6 });
  } catch (e) {
    out.push({ page_url: url, ...parseMeta(url), images: [], error: "fetch_failed" });
    process.stderr.write("✗ " + (i + 1) + "\n");
    return;
  }
  // ── صورة الورقة ──────────────────────────────────────────────────────
  // كل صفحة على iraqedu.net = ورقة امتحانية واحدة، وصورتها هي الصورة
  // الرئيسية المُعلَنة في JSON-LD كـ ImageObject. أي صور أخرى بالصفحة هي
  // مصغّرات "مقالات ذات صلة" (كتلة jet-engine-listing) وتخصّ أوراقاً أخرى
  // لها صفحاتها المستقلة ضمن نفس القائمة — فاستخراجها هنا يُنتج تكراراً.
  const featured = (html.match(/"@type":"ImageObject"[\s\S]{0,400}?"url":"(https:\/\/iraqedu\.net\/wp-content\/uploads\/[^"]+?\.(?:jpg|jpeg|png))"/i) || [])[1] || null;
  const imgs = featured && !/logo|icon|avatar|favicon/i.test(featured)
    ? [featured.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpg|jpeg|png)$)/i, "")]
    : [];

  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  out.push({ page_url: url, title: title.trim(), ...parseMeta(url), images: imgs });
  process.stderr.write("✓ " + (i + 1) + "/" + pages.length + " — " + imgs.length + " صورة\n");
});

fs.writeFileSync(process.argv[3], JSON.stringify({
  generated_at: new Date().toISOString(),
  source: "iraqedu.net",
  page_count: out.length,
  image_count: out.reduce((a, p) => a + p.images.length, 0),
  papers: out,
}, null, 1), "utf8");
console.log("✅ " + out.length + " ورقة، " + out.reduce((a, p) => a + p.images.length, 0) + " صورة");
