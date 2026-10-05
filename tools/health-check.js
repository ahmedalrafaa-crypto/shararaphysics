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

const G6 = ['g6c0','g6c1','g6c2','g6c3','g6c4','g6c5','g6c6','g6c7','g6c8','g6c9'];
const G3 = ['ch0','ch1','ch2','ch3','ch4','ch5','ch6','ch7','ch8','ch9'];
const G5 = ['g5c1','g5c2','g5c3','g5c4','g5c5','g5c7','g5c9','g5c10'];
const G1 = ['g1c1', 'g1c2', 'g1c3', 'g1c4', 'g1c5'];
const G2 = ['g2c1', 'g2c2', 'g2c3', 'g2c4', 'g2c5', 'g2c6'];
const G4 = ['g4c1', 'g4c2', 'g4c3', 'g4c5', 'g4c6', 'g4c7', 'g4c9'];

// ── ١) توزيع مواضع الإجابة الصحيحة ─────────────────────────────────────────
// الخلل الأصلي: الإجابة دائماً بالخيار الأول ⇒ درجة كاملة بلا قراءة.
console.log('\n\x1b[1m١) توزيع مواضع الإجابة الصحيحة\x1b[0m');
const RE_A = /(?:^|[,{\s])"?a"?\s*:\s*(\d)/gm;
for (const ch of [...G6, ...G5, ...G3, ...G1, ...G2, ...G4]) {
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
missing.length ? bad('ناقصة: ' + missing.join(', ')) : ok(`كل فصول السادس (${G6.length}) لها review.html`);

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

// ── ٥) التوقعات الوزارية للسادس: البنك موسوم والورقة متّسقة ─────────────────
// المقارنة الآلية بين التوقع والامتحان الحقيقي تعتمد على وسم كل سؤال بمفهومه —
// سؤال بلا وسم يسقط من المقارنة بصمت، فيجب أن يُكشف هنا.
console.log('\n\x1b[1m٥) التوقعات الوزارية (السادس)\x1b[0m');
{
  const J = f => JSON.parse(read(path.join('data', f)));
  const bank = J('wazariyat-sadis-ilmi.json').questions.filter(q => !/^ثوابت/.test(q.question_number || ''));
  const T = J('concept-tags-g6.json'), P = J('expected-papers-g6.json'), L = J('predictions-ledger-g6.json');
  const untagged = bank.filter(q => !(T.tags[q.id] || []).length);
  untagged.length ? bad('أسئلة وزارية بلا وسم مفهوم: ' + untagged.map(q => q.id).join(', '))
                  : ok(`كل الأسئلة الوزارية (${bank.length}) موسومة بمفهومها`);
  const ids = new Set(bank.map(q => q.id));
  const refs = P.papers.flatMap(pp => pp.questions.flatMap(q => q.parts.flatMap(x => x.ids || [x.id])));
  const dangling = refs.filter(i => !ids.has(i));
  dangling.length ? bad('الأوراق المتوقّعة تشير لأسئلة غير موجودة: ' + dangling.join(', '))
                  : ok(`كل فروع الأوراق المتوقّعة (${refs.length}) أسئلة وزارية حقيقية في البنك`);
  const open = P.papers.filter(pp => pp.status === 'open');
  open.length === 1 ? ok(`ورقة متوقّعة مفتوحة واحدة (${open[0].target.year} د${open[0].target.round})`)
                    : bad(`عدد الأوراق المفتوحة ${open.length} — المطلوب واحدة`);
  const rounds = new Set(bank.map(q => q.year + '-r' + q.round));
  L.papers_in_bank.length === rounds.size ? ok(`سجلّ التغذية الراجعة محدَّث (${rounds.size} أوراق)`)
    : bad('سجلّ التغذية الراجعة قديم — شغّل node tools/feedback-predictions-g6.js');
  const stu = read(path.join('predictions-g6', 'expected-paper.html'));
  /class="(src|ans|pwhy|why|rule)[ "]/.test(stu) ? bad('نسخة الطالب تحوي مصادر أو أجوبة أو تبريرات المعلّم')
                                                 : ok('نسخة الطالب بلا مصادر ولا أجوبة ولا تبريرات');
}

// ── ٦) نسخ المعلّم خارج مجلد الموقع ───────────────────────────────────────
// نسخة المعلّم فيها الأجوبة الرسمية ومصادر الأسئلة، وصفحة الإحصاءات للأستاذ —
// وجودهما داخل المستودع يعني نشرهما مع أول رفعة.
console.log('\n\x1b[1m٦) نسخ المعلّم لا تُنشر (السادس والثالث)\x1b[0m');
const teacherLeaks = ['predictions-g6/expected-paper-teacher.html', 'predictions-g6/preview.html',
  'predictions/expected-paper-teacher.html', 'predictions/preview.html']
  .filter(f => fs.existsSync(p(f)));
teacherLeaks.length
  ? bad('داخل مجلد الموقع وستُرفع: ' + teacherLeaks.join(', ') + ' — مكانها Desktop/شرارة-نسخ-المعلم')
  : ok('نسخة المعلّم وصفحة الإحصاءات خارج مجلد الموقع');

// ── ٧) الفصل التمهيدي للسادس مجاني فعلاً ─────────────────────────────────────
// requiredStage() بـ access-control.js تطابق /g6c\d+/ فتشمل g6c0 — أي درس أو اختبار أو
// نشاط فيه يحمّل السكربت سيُقفل خلف كود اشتراك، بينما الفصل معلَن للطلاب كمجاني.
// المسموح فقط: الخريطة (بوضع الشارات data-badges-only) والمراجعة (مقفلة مثل باقي المراجعات).
console.log('\n\x1b[1m٧) الفصل التمهيدي للسادس (g6c0) مجاني\x1b[0m');
if (fs.existsSync(p('chapters', 'g6c0'))) {
  const locked = chapters('g6c0').filter(f => {
    if (f === 'review.html') return false;
    const src = read(path.join('chapters', 'g6c0', f));
    if (f === 'index.html') return /access-control\.js"(?![^>]*data-badges-only)/.test(src);
    return src.includes('access-control.js');
  });
  locked.length ? bad('صفحات g6c0 تحمّل access-control.js وستُقفل: ' + locked.join(', '))
                : ok('دروس g6c0 واختباره وأنشطته بلا قفل اشتراك');
}

// ── الخلاصة ────────────────────────────────────────────────────────────────
console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}\x1b[1m${fail ? '✗ فشل' : '✓ نجح'}\x1b[0m  ناجح: ${pass} · فاشل: ${fail}\n`);
if (fail) console.log('راجع الفحوص الفاشلة أعلاه قبل الرفع.\n');
process.exit(fail ? 1 : 0);
