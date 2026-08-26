#!/usr/bin/env node
/*
 * فحص صحة شرارة — يعيد إثبات كل ما تحقّقنا منه سابقاً، في كل مرة.
 *
 * سبب وجوده: بيوم 2026-08-26 انكشف أن ثلاثة إصلاحات موثَّقة سابقاً لم تكن
 * مطبَّقة فعلاً (مواضع الإجابات، فجوتا الطاقة، إطار الربح). كان يُحفظ ادعاء
 * الإصلاح لا دليله. هذا الملف يحوّل كل "مُصلَح" من كلمة إلى فحص يعيد إثبات
 * نفسه — فإن رجع الخلل بتعديل لاحق، يُكشف فوراً بدل أن يُكتشف عند طالب دافع.
 *
 * التشغيل:  node tools/health-check.js
 * الخروج:   0 = كل الفحوص ناجحة · 1 = فشل فحص واحد على الأقل
 *
 * عند إصلاح أي خلل جديد: أضِف له فحصاً هنا يمنع رجوعه. لا تكتفِ بتوثيقه.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const p = (...a) => path.join(ROOT, ...a);
const read = f => fs.readFileSync(p(f), 'utf8');
const chapters = n => fs.readdirSync(p('chapters', n)).filter(f => f.endsWith('.html'));

let pass = 0, fail = 0;
const ok  = m => { pass++; console.log('  \x1b[32m✓\x1b[0m ' + m); };
const bad = m => { fail++; console.log('  \x1b[31m✗\x1b[0m ' + m); };

const G6 = ['g6c1','g6c2','g6c3','g6c4','g6c5','g6c6','g6c7','g6c8','g6c9'];
const G3 = ['ch0','ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8','ch9'];

// ── ١) توزيع مواضع الإجابة الصحيحة ─────────────────────────────────────────
// الخلل الأصلي: الإجابة دائماً بالخيار الأول ⇒ درجة كاملة بلا قراءة.
console.log('\n\x1b[1m١) توزيع مواضع الإجابة الصحيحة\x1b[0m');
const RE_A = /(?:^|[,{\s])"?a"?\s*:\s*(\d)/gm;
for (const ch of [...G6, ...G3]) {
  const dir = p('chapters', ch);
  if (!fs.existsSync(dir)) continue;
  const counts = [0, 0, 0, 0];
  let total = 0;
  for (const f of chapters(ch)) {
    const src = read(path.join('chapters', ch, f));
    let m; RE_A.lastIndex = 0;
    while ((m = RE_A.exec(src))) { const i = +m[1]; if (i < 4) { counts[i]++; total++; } }
  }
  if (total < 8) continue;                       // عيّنة أصغر من أن يُحكم عليها
  const top = Math.max(...counts) / total;
  if (top > 0.55) bad(`${ch}: ${Math.round(top*100)}% من الإجابات بموضع واحد (${total} سؤالاً) — الخلل رجع`);
  else pass++;
}
if (!fail) ok(`كل الفصول: لا موضع يتجاوز 55% من الإجابات`);

// ── ٢) قيم صُحّحت سابقاً — يجب ألا تعود ────────────────────────────────────
// المصدر PHY6: السيليكون 1.1eV و الجرمانيوم 0.72eV عند 300K (لا 1.12 و 0.67).
console.log('\n\x1b[1m٢) القيم المصحّحة (فجوة الطاقة بـg6c7)\x1b[0m');
for (const [f, banned] of [
  ['chapters/g6c7/lesson2.html', ['1.12', '0.67', '1.79×10⁻¹⁹', '1.11×10⁻⁶', '1110']],
  ['chapters/g6c7/lesson7.html', ['1110']],
  ['chapters/g6c7/questions.html', ['1110']],
]) {
  const src = read(f);
  const hit = banned.filter(b => src.includes(b));
  if (hit.length) bad(`${f}: عادت قيم قديمة → ${hit.join(', ')}`);
  else ok(`${f}: نظيف`);
}

// ── ٣) صفحات المراجعة موجودة لكل فصول السادس ───────────────────────────────
console.log('\n\x1b[1m٣) صفحات المراجعة السريعة (السادس)\x1b[0m');
const missing = G6.filter(ch => !fs.existsSync(p('chapters', ch, 'review.html')));
missing.length ? bad('ناقصة: ' + missing.join(', ')) : ok('كل الفصول التسعة لها review.html');

// ── ٤) عدم تسريب بيانات الدروس قبل التفعيل ─────────────────────────────────
// الثغرة الأصلية: lessons-data*.js كان يُحمَّل بوسم <script src> ثابت بصفحات
// المراجعة، فتصل كل الأجوبة لأي زائر بلا كود تفعيل.
console.log('\n\x1b[1m٤) حماية بيانات الدروس (لا تحميل قبل التفعيل)\x1b[0m');
let leaks = 0;
for (const ch of [...G6, ...G3]) {
  const f = path.join('chapters', ch, 'review.html');
  if (!fs.existsSync(p(f))) continue;
  const src = read(f);
  if (/<script[^>]+src=["'][^"']*lessons-data[^"']*["']/.test(src)) {
    bad(`${f}: يحمّل lessons-data بوسم ثابت — تسريب أجوبة قبل التفعيل`); leaks++;
  }
}
if (!leaks) ok('لا صفحة مراجعة تحمّل بيانات الدروس بوسم ثابت');

// ── الخلاصة ────────────────────────────────────────────────────────────────
console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}\x1b[1m${fail ? '✗ فشل' : '✓ نجح'}\x1b[0m  ناجح: ${pass} · فاشل: ${fail}\n`);
if (fail) console.log('راجع الفحوص الفاشلة أعلاه قبل الرفع.\n');
process.exit(fail ? 1 : 0);
