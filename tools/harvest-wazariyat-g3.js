#!/usr/bin/env node
/**
 * جمع أوراق الامتحانات الوزارية للثالث المتوسط من iraqedu.net.
 *
 * يختلف عن حاصد السادس في اختيار الصورة: صفحات الثالث تُعلن في JSON-LD
 * صورةَ الموقع الافتراضية (112.png) لا صورة الورقة، فنستخرج بدلاً منها
 * صور المحتوى الرئيسي — أي ما يسبق كتلة "مقالات ذات صلة"، بعد استبعاد
 * شعارات الموقع وأيقوناته.
 *
 * لا يستخرج نص السؤال — الأوراق صور، والنقل مرحلة لاحقة منفصلة.
 *
 * الاستعمال: node tools/harvest-wazariyat-g3.js <exam-pages.txt> <out.json>
 */
const fs = require("fs");
const { execFileSync } = require("child_process");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

// الثالث المتوسط مرحلة واحدة بلا مسارات (لا أحيائي ولا تطبيقي)
function parseMeta(slug) {
  const s = decodeURIComponent(slug);
  const ym = s.match(/\b(20\d{2})\b/);
  const year = ym ? +ym[1] : null;

  let round = null;
  if (/دور-?(?:ال)?اول/.test(s)) round = 1;
  else if (/دور-?(?:ال)?ثاني/.test(s)) round = 2;
  else if (/دور-?(?:ال)?ثالث/.test(s)) round = 3;
  else if (/تمهيدي/.test(s)) round = 0;

  // فئات خاصة تظهر أحياناً بعناوين الأوراق
  let cohort = "داخل القطر";
  if (/نازحين/.test(s)) cohort = "نازحين";
  else if (/خارج-القطر|خارج/.test(s)) cohort = "خارج القطر";

  return { year, round, track: "موحد", cohort };
}

const SITE_CHROME = /logo|icon|avatar|favicon|\/112\.png/i;

const pages = fs.readFileSync(process.argv[2], "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
const out = [];

pages.forEach((url, i) => {
  let html;
  try {
    html = execFileSync("curl", ["-sL", "-A", UA, "--max-time", "30", url], { encoding: "utf8", maxBuffer: 40e6 });
  } catch (e) {
    out.push({ page_url: url, ...parseMeta(url), images: [], error: "fetch_failed" });
    process.stderr.write("✗ " + (i + 1) + "\n");
    return;
  }

  // نقتطع عند كتلة "مقالات ذات صلة" لأن مصغّراتها تخصّ أوراقاً أخرى
  const cut = html.search(/jet-engine-listing|elementor-widget-loop/i);
  const main = cut > 0 ? html.slice(0, cut) : html;

  const imgs = [...new Set(
    (main.match(/https:\/\/iraqedu\.net\/wp-content\/uploads\/[^"'\s)<>]+\.(?:jpg|jpeg|png)/gi) || [])
      .map((u) => u.replace(/-\d{2,4}x\d{2,4}(?=\.(?:jpg|jpeg|png)$)/i, ""))
      .filter((u) => !SITE_CHROME.test(u))
  )];

  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  out.push({ page_url: url, title: title.trim(), ...parseMeta(url), images: imgs });
  process.stderr.write("· " + (i + 1) + "/" + pages.length + "\r");
});

const manifest = {
  grade: "ثالث_متوسط",
  source: "iraqedu.net",
  harvested_at: new Date().toISOString().slice(0, 10),
  page_count: out.length,
  image_count: out.reduce((a, p) => a + p.images.length, 0),
  papers: out,
};
fs.writeFileSync(process.argv[3], JSON.stringify(manifest, null, 2), "utf8");
console.log("\n✅ " + out.length + " ورقة، " + manifest.image_count + " صورة");
const noImg = out.filter((p) => !p.images.length);
if (noImg.length) console.log("⚠️ بلا صورة: " + noImg.length);
