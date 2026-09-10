#!/usr/bin/env node
/**
 * توليد صفحة التوقعات الوزارية للسادس العلمي من البيانات المقاسة.
 *
 * كل رقم على الصفحة يأتي من data/stats-g6.json المحسوب آلياً من
 * data/qbank-g6.json — لا أرقام مكتوبة يدوياً ولا نماذج امتحانات مؤلّفة.
 *
 * الاستعمال: node tools/build-predictions-page-g6.js [out.html]
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const S = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "stats-g6.json"), "utf8"));

const CH = {
  1: "المتسعات", 2: "الحث الكهرومغناطيسي والذاتي", 3: "التيار المتناوب",
  4: "الموجات الكهرومغناطيسية", 5: "البصريات الفيزيائية", 6: "الفيزياء الحديثة",
  7: "إلكترونيات الحالة الصلبة", 8: "الأطياف الذرية والليزر", 9: "الفيزياء النووية",
};

// أسماء المواضيع في المصدر مأخوذة من عناوين أقسام ملزمة الحلول، وبعضها
// غير مفهوم للطالب ("المجموعة الثانية") — نترجمها لأسماء منهجية واضحة.
const TOPIC_NAMES = {
  // شبه مضمونة
  "6|التأثير الكهروضوئي": "التأثير الكهروضوئي",
  "9|الشحنة ونصف القطر النووي": "شحنة النواة ونصف قطرها",
  "2|مولد يدور": "المولّد الدوّار والقوة الدافعة المحتثة",
  "3|التوازي": "دائرة RLC — الربط بالتوازي",
  "2|ملف وتغيّر كثافة الفيض": "ملف يتغيّر فيضه المغناطيسي",
  "2|حث ذاتي": "الحث الذاتي",
  "6|طول موجة دي برولي": "طول موجة دي برولي",
  "6|مسائل الجسم الأسود": "إشعاع الجسم الأسود (قانون فيّن)",
  "1|توالي متسعتين": "ربط المتسعات على التوالي",
  // متناوبة
  "8|أنبوبة الأشعة السينية": "أنبوبة الأشعة السينية",
  "7|ترانزستور": "الترانزستور — ربح التيار والفولطية",
  "7|ترانزستور القاعدة المشتركة": "الترانزستور — القاعدة المشتركة",
  "2|الساق الموصلة المنزلقة": "الساق الموصلة المنزلقة",
  "3|الرنين": "الرنين الكهربائي",
  "1|ثابت العزل الكهربائي": "ثابت العزل الكهربائي (K)",
  "1|إيجاد K": "إيجاد ثابت العزل K",
  "5|محزز الحيود": "محزز الحيود",
  "3|التوالي": "دائرة RLC — الربط بالتوالي",
  "3|دوائر RLC": "دوائر RLC — الممانعة وعامل القدرة",
  "2|الحث المتبادل": "الحث المتبادل بين ملفين",
  "2|RL": "دائرة RL العابرة",
  "2|RL والحث المتبادل معاً": "دائرة RL مع الحث المتبادل",
  "6|مبدأ عدم التأكد": "مبدأ عدم التأكد (هايزنبرغ)",
  "8|طاقة الفوتون وانتقالات الذرة": "طاقة الفوتون وانتقالات الذرة",
  "9|طاقة الربط النووية": "طاقة الربط النووية",
  "1|الشحنة والسعة بعد إدخال العازل": "الشحنة والسعة بعد إدخال العازل",
  "1|المتسعة مع مقاومة": "المتسعة في دائرة فيها مقاومة",
  "1|أكبر وأصغر سعة مكافئة": "أكبر وأصغر سعة مكافئة",
  // مرشّحة للعودة
  '2|RL بطريقة "كسر الفولطية المطبّقة"': "دائرة RL العابرة — كسر الفولطية",
  "2|RL: القوة الدافعة والمعدل الزمني": "دائرة RL — المعدل الزمني لتغيّر التيار",
  "3|مسائل المقاومة صرف والمحث صرف والمتسعة صرف": "المقاومة والمحث والمتسعة الصرف",
  "3|مسائل متسعة ذات سعة صرف": "المتسعة ذات السعة الصرف",
  "3|دائرة توالي RLC كاملة": "دائرة RLC متوالية كاملة",
  "3|تحويل بطارية (مستمر) إلى مصدر متناوب": "الاستبدال بين مصدر مستمر ومتناوب",
  "3|إيجاد معامل الحث الذاتي من مركّبات الدائرة": "إيجاد معامل الحث الذاتي من مركّبات الدائرة",
  "1|توالي مع الطاقة": "ربط المتسعات على التوالي مع الطاقة",
  "1|توالي ثلاث متسعات": "ربط ثلاث متسعات على التوالي",
};
function cleanTopic(t) {
  const key = t.chapter + "|" + t.topic;
  if (TOPIC_NAMES[key]) return TOPIC_NAMES[key];
  // تنقية عامة لما لم يُترجم يدوياً
  return String(t.topic)
    .replace(/\s*\([^)]{12,}\)\s*$/, "")   // صيغ رياضية طويلة بين قوسين
    .replace(/\s*\(تتمة\)\s*/g, " ")        // علامات "تتمة"
    .replace(/\s*\+\s*.*$/, "")             // مواضيع مركّبة: نُبقي الأول
    .replace(/\s*[،,]\s*$/, "")
    .replace(/\s+/g, " ").trim();
}

// ما أخذه الدور الأول 2026 فعلياً — مصدره كشف الأجوبة النموذجية الرسمي،
// حيث تُسنِد الوزارة لكل فرع رقم فصله. هذا تصنيفها هي لا تقديرنا.
// تسلسل الأدوار في السنة الدراسية الواحدة — يُشتَقّ منه الدورُ المستهدف تلقائياً
const ROUND_SEQ = ["التمهيدي", "الدور الأول", "الدور الثاني", "الدور الثالث"];

// آخر دور جرى ونتيجة توقعاتنا له — من سجلّ التغذية الراجعة (tools/feedback-predictions-g6.js)،
// وعدد فروع كل فصل محسوب من وسوم أسئلة الورقة الحقيقية لا مكتوب يدوياً.
const LEDGER = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "predictions-ledger-g6.json"), "utf8"));
const TAGS = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "concept-tags-g6.json"), "utf8"));
const LR = LEDGER.last_round;
const SCORED = LEDGER.scored[LEDGER.scored.length - 1] || null;
const byChapter = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
JSON.parse(fs.readFileSync(path.join(ROOT, "data", "wazariyat-sadis-ilmi.json"), "utf8")).questions
  .filter((q) => q.year === LR.year && q.round === LR.round)
  .forEach((q) => {
    new Set((TAGS.tags[q.id] || []).map((c) => +TAGS.concepts[c][0].split("-")[0].slice(3)))
      .forEach((ch) => { byChapter[ch]++; });
  });

const LAST_ROUND = {
  year: LR.year,
  round: LR.round, // ← يُقرأ من السجلّ: انقل الورقة الجديدة ثم شغّل feedback-predictions-g6.js
  label: LR.label,
  source: "ورقة الامتحان الحقيقية بعد وسم فروعها بمفاهيمها",
  byChapter,
  // ← يُحدَّث يدوياً بعد كل دور: ما أخذته الورقة الأخيرة ← ما يُرجَّح (يطابق data/expected-papers-g6.json)
  took: [
    { what: "متسعتان على <b>التوازي</b> مع عازل (البطارية مربوطة)", then: "<b>التوالي</b> مع عازل، أو ربط <b>مختلط</b>" },
    { what: "دائرة <b>R‖C</b> متوازية + مخطط التيارات", then: "<b>الرنين</b> المتوالي، أو ملف على مصدر مستمر ثم متناوب" },
    { what: "مسألة <b>الحث المتبادل</b> بين ملفين", then: "<b>الحث الذاتي</b> أو <b>المولّد الدوّار</b>" },
    { what: "الكهروضوئية: <b>طول موجة العتبة</b>", then: "<b>جهد الإيقاف</b>" },
    { what: "الأشعة السينية: <b>أعظم تردد</b>", then: "<b>أقصر طول موجي</b> λ_min" },
    { what: "الترانزستور: <b>القاعدة المشتركة</b>", then: "<b>الباعث المشترك</b> (ربح التيار β)" },
    { what: "شرح <b>دائرة الاهتزاز LC</b> في موضع النشاط", then: "نشاط <b>رادة السعة X_C</b> أو <b>شحن المتسعة وتفريغها</b>" },
    { what: "مميزات <b>الموجات الفضائية</b>", then: "<b>الموجات السماوية</b>" },
  ],
};

// الدور المستهدف بالتوقعات — مشتقّ من آخر دور جرى، لا مكتوب يدوياً
// = هدف الورقة المفتوحة في data/expected-papers-g6.json — مصدر واحد للصفحتين،
// لأن الدور التالي لا يُشتقّ آلياً (الدور الثالث لا يُعقد كل سنة).
const TARGET = (function () {
  const open = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "expected-papers-g6.json"), "utf8"))
    .papers.find((p) => p.status === "open");
  return { label: ROUND_SEQ[open.target.round] + " " + open.target.year, year: open.target.year };
})();

// لام الجر مع "ال" التعريف تُدغَم: لـ + الدور ← للدور
const lam = (t) => (String(t).startsWith("ال") ? "لل" + String(t).slice(2) : "لـ" + t);

const CONTACT = {
  name: "الأستاذ أحمد رافع — فيزياء",
  phone: "07800155157",
  email: "ahmed.alrafaa@gmail.com",
  site: "shararaphysics.netlify.app",
};

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const SPAN = S.year_span;
const maxCount = Math.max.apply(null, S.chapter_weight.map(function (c) { return c.count; }));

function weightBadge(pct) {
  if (pct >= 13) return ["عالٍ", "#0f9d58"];
  if (pct >= 5) return ["متوسط", "#e8a317"];
  return ["منخفض", "#d64550"];
}

const chapterRows = S.chapter_weight.map(function (c) {
  const b = weightBadge(c.pct), lbl = b[0], col = b[1];
  const gone = LAST_ROUND.byChapter[c.chapter] === 0;
  return '<tr' + (gone ? ' class="due"' : '') + '>' +
    '<td><b>ف' + c.chapter + '</b> ' + esc(CH[c.chapter]) +
      (gone ? ' <span class="tag due">لم يأتِ بالدور السابق</span>' : '') + '</td>' +
    '<td class="num">' + c.pct + '%</td>' +
    '<td style="width:34%"><span class="track"><span class="fill" style="width:' +
      (100 * c.count / maxCount).toFixed(1) + '%;background:' + col + '"></span></span></td>' +
    '<td><span class="pill" style="background:' + col + '">' + lbl + '</span></td>' +
    '<td class="num">' + c.years + '/' + SPAN + '</td>' +
    '<td class="num">' + (LAST_ROUND.byChapter[c.chapter] === undefined ? "—" : LAST_ROUND.byChapter[c.chapter]) + '</td>' +
    '</tr>';
}).join("");

// بعد التنقية قد يؤول موضوعان خامان إلى اسم واحد — ندمجهما
function dedupe(list) {
  const by = new Map();
  list.forEach(function (t) {
    const k = t.chapter + "|" + cleanTopic(t);
    const p = by.get(k);
    if (!p) return by.set(k, Object.assign({}, t));
    p.count += t.count;
    p.year_count = Math.max(p.year_count, t.year_count);
    p.last = Math.max(p.last, t.last);
  });
  return Array.from(by.values()).sort(function (a, b) {
    return b.year_count - a.year_count || b.count - a.count;
  });
}

function prioCol(list, extra) {
  return dedupe(list).map(function (t) {
    return '<li><span class="pt">' + esc(cleanTopic(t)) + '</span>' +
      '<span class="tag">ف' + t.chapter + ' · ' + extra(t) + '</span></li>';
  }).join("");
}

const swapRows = LAST_ROUND.took.map(function (r) {
  return '<tr><td>' + r.what + '</td><td class="arrow">←</td><td>' + r.then + '</td></tr>';
}).join("");

const html = '<title>توقعات ' + TARGET.label + ' — فيزياء السادس العلمي</title>\n' +
"<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n" +
"<link href=\"https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap\" rel=\"stylesheet\">\n" +
"<style>\n" +
":root{--ink:#111a33;--soft:#616c92;--line:#e4e8f5;--bg:#f4f6fc;--card:#fff;--blue:#2b3f8f;--violet:#6b3fa8;--green:#0f9d58;--amber:#e8a317;--red:#d64550;--shadow:0 1px 2px rgba(17,26,51,.04),0 8px 24px -12px rgba(17,26,51,.14);--radius:16px}\n" +
"@media (prefers-color-scheme:dark){:root{--ink:#e8ecf8;--soft:#98a3c6;--line:#27304d;--bg:#0d1220;--card:#151c30;--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px -12px rgba(0,0,0,.6)}}\n" +
"*{box-sizing:border-box}\n" +
"body{margin:0;font-family:Cairo,\"Segoe UI\",Tahoma,sans-serif;background:var(--bg);color:var(--ink);direction:rtl;line-height:1.85;-webkit-font-smoothing:antialiased}\n" +
".wrap{max-width:1000px;margin:0 auto;padding:20px 16px 40px}\n" +
"header{position:relative;overflow:hidden;background:linear-gradient(135deg,#22347a 0%,#2b3f8f 45%,#6b3fa8 100%);color:#fff;border-radius:22px;padding:30px 26px;margin-bottom:18px;box-shadow:0 18px 40px -20px rgba(43,63,143,.7)}\n" +
"header::after{content:\"\";position:absolute;top:-70px;inset-inline-start:-50px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.16),transparent 68%);pointer-events:none}\n" +
".target{display:inline-block;background:#fff;color:#22347a;border-radius:999px;padding:5px 16px;font-size:.86rem;font-weight:900;margin-bottom:12px;position:relative;box-shadow:0 6px 16px -8px rgba(0,0,0,.5)}\n" +
"header h1{margin:0 0 8px;font-size:clamp(1.35rem,4.2vw,1.85rem);font-weight:900;letter-spacing:-.4px;position:relative}\n" +
"header p{margin:0;opacity:.94;font-size:.95rem;font-weight:500;position:relative;max-width:62ch}\n" +
".chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;position:relative}\n" +
".chip{background:rgba(255,255,255,.17);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:5px 14px;font-size:.79rem;font-weight:700}\n" +
".disclaimer{background:#fff8e6;border:1px solid #f0d79a;border-inline-start:5px solid var(--amber);border-radius:14px;padding:14px 17px;margin:16px 0;font-size:.89rem;color:#4a3a12;box-shadow:var(--shadow)}\n" +
"@media (prefers-color-scheme:dark){.disclaimer{background:#2a2312;border-color:#5a4a1e;color:#f3e4bd}}\n" +
"h2{font-size:1.16rem;font-weight:800;margin:32px 0 6px;display:flex;align-items:center;gap:10px}\n" +
"h2 .n{background:linear-gradient(135deg,var(--blue),var(--violet));color:#fff;border-radius:10px;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:900;flex:none;box-shadow:0 4px 10px -4px rgba(43,63,143,.7)}\n" +
".card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:8px 16px;margin-bottom:14px;overflow-x:auto;box-shadow:var(--shadow)}\n" +
".lead{font-size:.88rem;color:var(--soft);margin:0 0 14px;padding-inline-start:40px}\n" +
"table{width:100%;border-collapse:collapse;font-size:.89rem;min-width:540px}\n" +
"th,td{padding:11px 10px;text-align:right;border-bottom:1px solid var(--line)}\n" +
"tr:last-child td{border-bottom:0}\n" +
"th{font-size:.75rem;font-weight:800;color:var(--soft)}\n" +
"td.num{font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}\n" +
"table tr:hover{background:rgba(43,63,143,.04)}\n" +
"tr.due{background:rgba(15,157,88,.11)}\n" +
".track{display:block;width:100%;height:10px;background:rgba(97,108,146,.16);border-radius:99px;overflow:hidden}\n" +
".fill{display:block;height:100%;border-radius:99px}\n" +
".pill{display:inline-block;font-size:.68rem;font-weight:800;color:#fff;border-radius:999px;padding:3px 11px;white-space:nowrap}\n" +
".tag{font-size:.71rem;font-weight:700;color:var(--soft);background:rgba(97,108,146,.13);border-radius:999px;padding:3px 10px;margin-inline-start:6px;white-space:nowrap}\n" +
".tag.due{background:var(--green);color:#fff}\n" +
".prio{display:grid;grid-template-columns:repeat(auto-fit,minmax(265px,1fr));gap:14px}\n" +
".pcol{background:var(--card);border:1px solid var(--line);border-top-width:5px;border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow)}\n" +
".pcol h3{margin:0 0 3px;font-size:1rem;font-weight:800}\n" +
".pcol .sub{font-size:.77rem;color:var(--soft);margin-bottom:12px}\n" +
".pcol ul{margin:0;padding:0;list-style:none;counter-reset:p}\n" +
".pcol li{padding:9px 0;border-bottom:1px dashed var(--line);font-size:.88rem;display:flex;justify-content:space-between;align-items:center;gap:10px}\n" +
".pcol li::before{counter-increment:p;content:counter(p);flex:none;width:20px;height:20px;border-radius:6px;background:rgba(97,108,146,.14);color:var(--soft);font-size:.67rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center}\n" +
".pcol li:last-child{border-bottom:0}\n" +
".pt{font-weight:600;flex:1}\n" +
".due-box{position:relative;overflow:hidden;background:linear-gradient(135deg,#0f9d58,#0a6e3e);color:#fff;border-radius:var(--radius);padding:20px 22px;margin-bottom:14px;box-shadow:0 16px 34px -18px rgba(15,157,88,.8)}\n" +
".due-box::after{content:\"\";position:absolute;top:-50px;inset-inline-end:-30px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.15),transparent 70%)}\n" +
".due-box h3{margin:0 0 6px;font-size:1.08rem;font-weight:900;position:relative}\n" +
".due-box p{margin:0;font-size:.9rem;opacity:.96;position:relative}\n" +
".arrow{color:var(--violet);font-weight:900;padding:0 6px;text-align:center}\n" +
"footer{text-align:center;color:var(--soft);font-size:.82rem;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}\n" +
".bar{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px}\n" +
".btn{border:0;border-radius:12px;padding:12px 22px;font-family:inherit;font-size:.9rem;font-weight:800;cursor:pointer;background:linear-gradient(135deg,var(--blue),var(--violet));color:#fff;box-shadow:0 8px 18px -8px rgba(43,63,143,.75)}\n" +
".btn:hover{opacity:.92}\n" +
".contact{background:linear-gradient(135deg,#22347a,#6b3fa8);color:#fff;border-radius:var(--radius);padding:18px 20px;margin-top:20px;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}\n" +
".contact .cname{font-weight:900;font-size:1.04rem;margin-bottom:8px}\n" +
".contact .crow{display:flex;gap:22px;justify-content:center;flex-wrap:wrap;font-size:.93rem;font-weight:700}\n" +
".contact .csite{margin-top:8px;font-size:.9rem;font-weight:800;direction:ltr}\n" +
"@media (max-width:560px){.wrap{padding:14px 12px 32px}header{padding:24px 20px;border-radius:18px}.lead{padding-inline-start:0}}\n" +
"@media print{body{background:#fff;color:#000}.bar{display:none}.card,.pcol,.contact,.due-box{break-inside:avoid;box-shadow:none}header,.due-box,.contact{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n" +
'</style>\n\n' +
'<div class="wrap">\n' +
'<header>\n' +
'  <div class="target">🎯 توقعات <b>' + TARGET.label + '</b></div>\n' +
'  <h1>🔮 التوقعات الوزارية — السادس العلمي</h1>\n' +
'  <p>لا نتوقّع سنوات قادمة. هذه الصفحة مخصَّصة <b>' + lam(TARGET.label) + ' وحده</b> — مبنيّة على ما جرى في ' + LAST_ROUND.label + ' وما قبله، وتُعاد كتابتها بالكامل بعد كل دور.</p>\n' +
'  <div class="chips">\n' +
'    <span class="chip">📊 ' + S.total_questions + ' سؤالاً مصنّفاً</span>\n' +
'    <span class="chip">🗓️ ' + SPAN + ' سنة (' + S.years_covered[0] + '–' + S.years_covered[S.years_covered.length - 1] + ')</span>\n' +
'    <span class="chip">✅ ' + S.dated_questions + ' سؤالاً مؤرّخاً بسنته ودوره</span>\n' +
'    <span class="chip">📄 آخر تحديث: بعد ' + LAST_ROUND.label + '</span>\n' +
'  </div>\n' +
'</header>\n\n' +
'<div class="bar"><button class="btn" onclick="window.print()">🖨️ حفظ PDF / طباعة</button></div>\n\n' +
'<div class="disclaimer">\n' +
'  <b>⚠️ تنويه:</b> هذه <b>أولويات مراجعة</b> محسوبة من تكرار الأسئلة الوزارية السابقة — <b>ليست أسئلة مسرّبة ولا مضمونة</b>. كل رقم هنا مأخوذ من أوراق امتحانية حقيقية، ومكتوب بجانبه عدد السنوات التي ظهر فيها.\n' +
'</div>\n\n' +
'<div class="due-box">\n' +
(SCORED
  ? '  <h3>📊 كيف أصابت توقعاتنا ل' + SCORED.label.replace(/^ال/, "ل") + '؟</h3>\n' +
    '  <p>المسائل والأنشطة الكبرى: <b>' + SCORED.summary.big_hit + ' من ' + SCORED.summary.big_total + '</b> · ' +
    'من درجات الورقة المتوقَّعة جاء فعلاً: <b>' + SCORED.summary.marks_pct + '%</b> · ' +
    'قاعدة «القالب ثابت والشكل يتغيّر»: <b>' + LEDGER.rules.R1.hits + '/' + LEDGER.rules.R1.total + '</b> · ' +
    'قاعدة «عودة سؤال سابق»: <b>' + LEDGER.rules.R3.hits + '/' + LEDGER.rules.R3.total + '</b> · ' +
    'قاعدة «الفصل الغائب يعود»: <b>' + LEDGER.rules.R4.hits + '/' + LEDGER.rules.R4.total + '</b> — الفيزياء النووية غابت عن الدورين الأول والثاني 2026. ' +
    SCORED.cov.novel_pct + '% من فروع الورقة الحقيقية مواضيع لم تُسأل في أي ورقة سابقة عندنا.</p>\n'
  : '') +
'</div>\n\n' +
'<h2><span class="n">١</span> وزن كل فصل — مقاساً لا مقدَّراً</h2>\n' +
'<p class="lead">النسبة محسوبة من ' + S.dated_questions + ' سؤالاً وزارياً مؤرّخاً عبر ' + SPAN + ' سنة. العمود الأخير يبيّن كم فرعاً أخذه ' + LAST_ROUND.label + '.</p>\n' +
'<div class="card">\n<table>\n' +
'<tr><th>الفصل</th><th>الوزن</th><th></th><th>التقدير</th><th>ظهر في</th><th>الدور السابق</th></tr>\n' +
chapterRows + '\n</table>\n</div>\n\n' +
'<h2><span class="n">٢</span> أولويات المراجعة</h2>\n' +
'<p class="lead">مرتّبة حسب عدد السنوات التي ظهر فيها الموضوع فعلياً — ابدأ بالعمود الأخضر. <b>حدّ هذه اللوحة:</b> ' + S.unclassified.pct + '% من الأسئلة المؤرّخة (' + S.unclassified.count + ' سؤالاً) لم تحمل في مصدرها اسم موضوع صالحاً فبقيت خارج هذا التصنيف — أمّا أوزان الفصول أعلاه فغير متأثّرة بذلك.</p>\n' +
'<div class="prio">\n' +
'  <div class="pcol" style="border-top-color:#0f9d58">\n' +
'    <h3>🟢 شبه مضمونة</h3><div class="sub">ظهرت في ٤ سنوات فأكثر</div>\n' +
'    <ul>' + prioCol(S.priority.must, function (t) { return t.year_count + "/" + SPAN + " سنة · " + t.count + " سؤال"; }) + '</ul>\n' +
'  </div>\n' +
'  <div class="pcol" style="border-top-color:#e8a317">\n' +
'    <h3>🟡 متناوبة</h3><div class="sub">تظهر سنة وتغيب أخرى</div>\n' +
'    <ul>' + prioCol(S.priority.rotate.slice(0, 10), function (t) { return t.year_count + "/" + SPAN; }) + '</ul>\n' +
'  </div>\n' +
'  <div class="pcol" style="border-top-color:#d64550">\n' +
'    <h3>🔴 مرشّحة للعودة</h3><div class="sub">غابت ٣ سنوات فأكثر</div>\n' +
'    <ul>' + prioCol(S.priority.comeback.slice(0, 10), function (t) { return "آخر ظهور " + t.last; }) + '</ul>\n' +
'  </div>\n' +
'</div>\n\n' +
'<h2><span class="n">٣</span> ماذا أخذ ' + LAST_ROUND.label + '؟ وماذا يُرجَّح ' + lam(TARGET.label) + '؟</h2>\n' +
'<p class="lead">الوزارة تعيد <b>القالب</b> نفسه وتغيّر <b>العنصر</b> داخله. هذا الجدول يقارن ما استُهلك بما يُرجَّح.</p>\n' +
'<div class="card">\n<table>\n' +
'<tr><th style="width:47%">أخذه ' + LAST_ROUND.label + '</th><th></th><th>المرجَّح للدور القادم</th></tr>\n' +
swapRows + '\n</table>\n</div>\n\n' +
'<div class="contact">\n' +
'  <div class="cname">' + CONTACT.name + '</div>\n' +
'  <div class="crow"><span>📞 ' + CONTACT.phone + '</span><span>✉️ ' + CONTACT.email + '</span></div>\n' +
'  <div class="csite">🌐 ' + CONTACT.site + '</div>\n' +
'</div>\n\n' +
'<footer>\n' +
'مبنية على ' + S.total_questions + ' سؤالاً من أوراق وزارية حقيقية — تُحدَّث بعد كل دور امتحاني\n' +
'</footer>\n</div>\n';

// صفحة إحصاءات للأستاذ لا للطالب — تُولَّد خارج مجلد الموقع حتى لا تُرفع بالخطأ
const out = process.argv[2] || path.join(ROOT, "..", "شرارة-نسخ-المعلم", "preview-g6.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, "utf8");
console.log("✅ الصفحة وُلِّدت → " + out);
console.log("   مصدر كل الأرقام: data/stats-g6.json (" + S.total_questions + " سؤالاً، " + SPAN + " سنة)");
