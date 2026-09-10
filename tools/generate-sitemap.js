#!/usr/bin/env node
// يعيد توليد sitemap.xml بمسح كل صفحات الموقع فعلياً (بلا قائمة يدوية).
// شغّله بعد إضافة أي فصل أو صفحة جديدة:
//   node tools/generate-sitemap.js
//
// القاعدة: أي صفحة فيها <meta name="robots" content="noindex..."> تُستثنى تلقائياً،
// فلا حاجة لتحديث هذا السكربت عند حماية صفحة جديدة — يكفي إضافة وسم noindex لها.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://shararaphysics.netlify.app';

// مجلدات ليست صفحات موقع (أصول، أدوات، بيانات خام) — تُستثنى من المسح.
const EXCLUDE_DIRS = new Set(['assets', 'css', 'js', 'chapters', 'extracted', 'tools', '.git', '.claude', 'node_modules']);
// ملفات تحقق ملكية الموقع (Google/Bing/Yandex) — نص خام وليست صفحة حقيقية.
const VERIFICATION_FILE_RE = /^(google[a-f0-9]+|BingSiteAuth|yandex_[a-z0-9]+)\.html$/i;

function isNoindex(html) {
  return /<meta\s+name="robots"[^>]*noindex/i.test(html);
}
function isRealPage(html) {
  return /<html[\s>]/i.test(html);
}
function cleanUrl(relPath) {
  return relPath.replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '');
}
function chapterSortKey(filename) {
  if (filename === 'index.html') return [0, 0];
  const m = filename.match(/^lesson(\d+)\.html$/);
  if (m) return [1, parseInt(m[1], 10)];
  if (filename === 'exam.html') return [2, 0];
  if (filename === 'questions.html') return [3, 0];
  if (filename === 'review.html') return [4, 0];
  return [5, 0];
}

const urls = [];

// 1. الصفحة الرئيسية
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if (!isNoindex(html)) urls.push(`${SITE}/`);
}

// 2. صفحات جذر مستقلة (subscribe.html وأي ملف .html مشابه بالجذر)
for (const f of fs.readdirSync(ROOT).sort()) {
  if (!f.endsWith('.html') || f === 'index.html') continue;
  if (VERIFICATION_FILE_RE.test(f)) continue;
  const full = path.join(ROOT, f);
  if (!fs.statSync(full).isFile()) continue;
  const html = fs.readFileSync(full, 'utf8');
  if (!isRealPage(html) || isNoindex(html)) continue;
  urls.push(`${SITE}/${cleanUrl(f)}`);
}

// 3. مجلدات جذر بصفحة فهرس واحدة (predictions/, search/, analysis/, mock-exam-g3/, ...)
for (const f of fs.readdirSync(ROOT).sort()) {
  if (EXCLUDE_DIRS.has(f)) continue;
  const full = path.join(ROOT, f);
  if (!fs.statSync(full).isDirectory()) continue;
  const idxPath = path.join(full, 'index.html');
  if (!fs.existsSync(idxPath)) continue;
  const html = fs.readFileSync(idxPath, 'utf8');
  if (isNoindex(html)) continue;
  urls.push(`${SITE}/${f}/`);
}

// 4. كل فصول chapters/ (فهرس + دروس + امتحان/مراجعة/أسئلة حسب المتوفر)
const chaptersDir = path.join(ROOT, 'chapters');
for (const folder of fs.readdirSync(chaptersDir).sort()) {
  const folderPath = path.join(chaptersDir, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;
  const files = fs.readdirSync(folderPath)
    .filter(f => f.endsWith('.html'))
    .sort((a, b) => {
      const ka = chapterSortKey(a), kb = chapterSortKey(b);
      return ka[0] - kb[0] || ka[1] - kb[1];
    });
  for (const f of files) {
    const html = fs.readFileSync(path.join(folderPath, f), 'utf8');
    if (isNoindex(html)) continue;
    const rel = f === 'index.html' ? `chapters/${folder}/` : `chapters/${folder}/${cleanUrl(f)}`;
    urls.push(`${SITE}/${rel}`);
  }
}

const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')
  + '\n</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml: ${urls.length} رابط.`);
