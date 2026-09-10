#!/usr/bin/env node
/**
 * توليد صفحة التوقعات الوزارية للثالث متوسط — بنفس منهج صفحة السادس:
 * أولويات وأوزان مقاسة، لا نماذج امتحانات مؤلّفة لسنوات قادمة.
 *
 * مصدر الأرقام: data/stats-g3.json المستخرج من التحليل الإحصائي الأصلي
 * لـ616 سؤالاً وزارياً (2011–2023).
 *
 * الاستعمال: node tools/build-predictions-page-g3.js [out.html]
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const S = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "stats-g3.json"), "utf8"));

const CONTACT = {
  name: "الأستاذ أحمد رافع — فيزياء",
  phone: "07800155157",
  email: "ahmed.alrafaa@gmail.com",
  site: "shararaphysics.netlify.app",
};

const CH = {
  1: "الكهربائية الساكنة", 2: "المغناطيسية", 3: "التيار والمقاومة وقانون أوم",
  4: "الخلايا والبطاريات", 5: "القدرة والطاقة والأمان الكهربائي",
  6: "المغناطيسية الكهربائية والحث", 7: "المحولات الكهربائية",
  8: "الطاقة المتجددة", 9: "الغلاف الجوي والاتصالات",
};

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const SPAN = S.years;
const weights = S.chapter_weight.slice().sort((a, b) => b.count - a.count);
const maxCount = Math.max.apply(null, weights.map((c) => c.count));

function badge(pct) {
  if (pct >= 12) return ["عالٍ", "#0f9d58"];
  if (pct >= 8) return ["متوسط", "#e8a317"];
  return ["منخفض", "#d64550"];
}

const chapterRows = weights.map((c) => {
  const b = badge(c.pct);
  return '<tr>' +
    '<td><b>ف' + c.chapter + '</b> ' + esc(CH[c.chapter] || c.name) + '</td>' +
    '<td class="num">' + c.pct + '%</td>' +
    '<td style="width:38%"><span class="track"><span class="fill" style="width:' +
      (100 * c.count / maxCount).toFixed(1) + '%;background:' + b[1] + '"></span></span></td>' +
    '<td><span class="pill" style="background:' + b[1] + '">' + b[0] + '</span></td>' +
    '<td class="num">' + c.count + '</td></tr>';
}).join("");

const typeRows = Object.entries(S.type_distribution)
  .sort((a, b) => b[1] - a[1])
  .map(([t, n]) => {
    const pct = (100 * n / S.total_questions).toFixed(1);
    return '<tr><td>' + esc(t) + '</td><td class="num">' + n + '</td>' +
      '<td style="width:45%"><span class="track"><span class="fill" style="width:' +
      (100 * n / S.total_questions * 3.5).toFixed(1) + '%;background:#2b3f8f"></span></span></td>' +
      '<td class="num">' + pct + '%</td></tr>';
  }).join("");

function prioCol(list, extra) {
  return list.map((t) =>
    '<li><span class="pt">' + esc(t.topic) + '</span>' +
    '<span class="tag">ف' + t.chapter + ' · ' + extra(t) + '</span></li>').join("");
}

// الدور المستهدف = هدف الورقة المفتوحة في data/expected-papers-g3.json — مصدر واحد
// للصفحتين، لأن الدور التالي لا يُشتقّ آلياً (الدور الثالث لا يُعقد كل سنة).
const ROUND_SEQ = ["التمهيدي", "الدور الأول", "الدور الثاني", "الدور الثالث"];
const TARGET = (function () {
  const open = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "expected-papers-g3.json"), "utf8"))
    .papers.find((p) => p.status === "open");
  return { label: ROUND_SEQ[open.target.round] + " " + open.target.year };
})();

// لام الجر مع "ال" التعريف تُدغَم: لـ + الدور ← للدور
const lam = (t) => (String(t).startsWith("ال") ? "لل" + String(t).slice(2) : "لـ" + t);

const CSS = [
  ":root{--ink:#111a33;--soft:#616c92;--line:#e4e8f5;--bg:#f4f6fc;--card:#fff;--blue:#2b3f8f;--violet:#6b3fa8;--green:#0f9d58;--amber:#e8a317;--red:#d64550;--shadow:0 1px 2px rgba(17,26,51,.04),0 8px 24px -12px rgba(17,26,51,.14);--radius:16px}",
  "@media (prefers-color-scheme:dark){:root{--ink:#e8ecf8;--soft:#98a3c6;--line:#27304d;--bg:#0d1220;--card:#151c30;--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px -12px rgba(0,0,0,.6)}}",
  "*{box-sizing:border-box}",
  "body{margin:0;font-family:Cairo,\"Segoe UI\",Tahoma,sans-serif;background:var(--bg);color:var(--ink);direction:rtl;line-height:1.85;-webkit-font-smoothing:antialiased}",
  ".wrap{max-width:1000px;margin:0 auto;padding:20px 16px 40px}",
  "header{position:relative;overflow:hidden;background:linear-gradient(135deg,#22347a 0%,#2b3f8f 45%,#6b3fa8 100%);color:#fff;border-radius:22px;padding:30px 26px;margin-bottom:18px;box-shadow:0 18px 40px -20px rgba(43,63,143,.7)}",
  "header::after{content:\"\";position:absolute;top:-70px;inset-inline-start:-50px;width:250px;height:250px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.16),transparent 68%);pointer-events:none}",
  ".target{display:inline-block;background:#fff;color:#22347a;border-radius:999px;padding:5px 16px;font-size:.86rem;font-weight:900;margin-bottom:12px;position:relative;box-shadow:0 6px 16px -8px rgba(0,0,0,.5)}",
  "header h1{margin:0 0 8px;font-size:clamp(1.35rem,4.2vw,1.85rem);font-weight:900;letter-spacing:-.4px;position:relative}",
  "header p{margin:0;opacity:.94;font-size:.95rem;font-weight:500;position:relative;max-width:62ch}",
  ".chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;position:relative}",
  ".chip{background:rgba(255,255,255,.17);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:5px 14px;font-size:.79rem;font-weight:700}",
  ".disclaimer{background:#fff8e6;border:1px solid #f0d79a;border-inline-start:5px solid var(--amber);border-radius:14px;padding:14px 17px;margin:16px 0;font-size:.89rem;color:#4a3a12;box-shadow:var(--shadow)}",
  "@media (prefers-color-scheme:dark){.disclaimer{background:#2a2312;border-color:#5a4a1e;color:#f3e4bd}}",
  "h2{font-size:1.16rem;font-weight:800;margin:32px 0 6px;display:flex;align-items:center;gap:10px}",
  "h2 .n{background:linear-gradient(135deg,var(--blue),var(--violet));color:#fff;border-radius:10px;width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:900;flex:none;box-shadow:0 4px 10px -4px rgba(43,63,143,.7)}",
  ".card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:8px 16px;margin-bottom:14px;overflow-x:auto;box-shadow:var(--shadow)}",
  ".lead{font-size:.88rem;color:var(--soft);margin:0 0 14px;padding-inline-start:40px}",
  "table{width:100%;border-collapse:collapse;font-size:.89rem;min-width:540px}",
  "th,td{padding:11px 10px;text-align:right;border-bottom:1px solid var(--line)}",
  "tr:last-child td{border-bottom:0}",
  "th{font-size:.75rem;font-weight:800;color:var(--soft)}",
  "td.num{font-weight:800;white-space:nowrap;font-variant-numeric:tabular-nums}",
  "table tr:hover{background:rgba(43,63,143,.04)}",
  "tr.due{background:rgba(15,157,88,.11)}",
  ".track{display:block;width:100%;height:10px;background:rgba(97,108,146,.16);border-radius:99px;overflow:hidden}",
  ".fill{display:block;height:100%;border-radius:99px}",
  ".pill{display:inline-block;font-size:.68rem;font-weight:800;color:#fff;border-radius:999px;padding:3px 11px;white-space:nowrap}",
  ".tag{font-size:.71rem;font-weight:700;color:var(--soft);background:rgba(97,108,146,.13);border-radius:999px;padding:3px 10px;margin-inline-start:6px;white-space:nowrap}",
  ".tag.due{background:var(--green);color:#fff}",
  ".prio{display:grid;grid-template-columns:repeat(auto-fit,minmax(265px,1fr));gap:14px}",
  ".pcol{background:var(--card);border:1px solid var(--line);border-top-width:5px;border-radius:var(--radius);padding:16px 18px;box-shadow:var(--shadow)}",
  ".pcol h3{margin:0 0 3px;font-size:1rem;font-weight:800}",
  ".pcol .sub{font-size:.77rem;color:var(--soft);margin-bottom:12px}",
  ".pcol ul{margin:0;padding:0;list-style:none;counter-reset:p}",
  ".pcol li{padding:9px 0;border-bottom:1px dashed var(--line);font-size:.88rem;display:flex;justify-content:space-between;align-items:center;gap:10px}",
  ".pcol li::before{counter-increment:p;content:counter(p);flex:none;width:20px;height:20px;border-radius:6px;background:rgba(97,108,146,.14);color:var(--soft);font-size:.67rem;font-weight:800;display:inline-flex;align-items:center;justify-content:center}",
  ".pcol li:last-child{border-bottom:0}",
  ".pt{font-weight:600;flex:1}",
  ".due-box{position:relative;overflow:hidden;background:linear-gradient(135deg,#0f9d58,#0a6e3e);color:#fff;border-radius:var(--radius);padding:20px 22px;margin-bottom:14px;box-shadow:0 16px 34px -18px rgba(15,157,88,.8)}",
  ".due-box::after{content:\"\";position:absolute;top:-50px;inset-inline-end:-30px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.15),transparent 70%)}",
  ".due-box h3{margin:0 0 6px;font-size:1.08rem;font-weight:900;position:relative}",
  ".due-box p{margin:0;font-size:.9rem;opacity:.96;position:relative}",
  ".arrow{color:var(--violet);font-weight:900;padding:0 6px;text-align:center}",
  "footer{text-align:center;color:var(--soft);font-size:.82rem;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}",
  ".bar{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px}",
  ".btn{border:0;border-radius:12px;padding:12px 22px;font-family:inherit;font-size:.9rem;font-weight:800;cursor:pointer;background:linear-gradient(135deg,var(--blue),var(--violet));color:#fff;box-shadow:0 8px 18px -8px rgba(43,63,143,.75)}",
  ".btn:hover{opacity:.92}",
  ".contact{background:linear-gradient(135deg,#22347a,#6b3fa8);color:#fff;border-radius:var(--radius);padding:18px 20px;margin-top:20px;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
  ".contact .cname{font-weight:900;font-size:1.04rem;margin-bottom:8px}",
  ".contact .crow{display:flex;gap:22px;justify-content:center;flex-wrap:wrap;font-size:.93rem;font-weight:700}",
  ".contact .csite{margin-top:8px;font-size:.9rem;font-weight:800;direction:ltr}",
  "@media (max-width:560px){.wrap{padding:14px 12px 32px}header{padding:24px 20px;border-radius:18px}.lead{padding-inline-start:0}}",
  "@media print{body{background:#fff;color:#000}.bar{display:none}.card,.pcol,.contact,.due-box{break-inside:avoid;box-shadow:none}header,.due-box,.contact{-webkit-print-color-adjust:exact;print-color-adjust:exact}}",
].join("\n");

const html =
  '<title>توقعات ' + TARGET.label + ' — فيزياء الثالث متوسط</title>\n' +
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">\n' +
  '<style>\n' + CSS + '\n</style>\n\n' +
  '<div class="wrap">\n' +
  '<header>\n' +
  '  <div class="target">🎯 توقعات <b>' + TARGET.label + '</b></div>\n' +
  '  <h1>🔮 التوقعات الوزارية — الثالث متوسط</h1>\n' +
  '  <p>لا نتوقّع سنوات قادمة. هذه الصفحة مخصَّصة <b>' + lam(TARGET.label) + ' وحده</b> — وتُعاد كتابتها بالكامل بعد كل دور.</p>\n' +
  '  <div class="chips">' +
  '<span class="chip">📊 ' + S.total_questions + ' سؤالاً وزارياً</span>' +
  '<span class="chip">🗓️ ' + SPAN + ' سنة (' + S.span_label + ')</span>' +
  '<span class="chip">📚 ٩ فصول</span></div>\n' +
  '</header>\n\n' +
  '<div class="bar"><button class="btn" onclick="window.print()">🖨️ حفظ PDF / طباعة</button></div>\n\n' +
  '<div class="disclaimer"><b>⚠️ تنويه:</b> هذه <b>أولويات مراجعة</b> محسوبة من تكرار الأسئلة الوزارية السابقة — ' +
  '<b>ليست أسئلة مسرّبة ولا مضمونة</b>. بجانب كل موضوع عدد السنوات التي ظهر فيها فعلاً.</div>\n\n' +
  '<h2><span class="n">١</span> وزن كل فصل — مقاساً لا مقدَّراً</h2>\n' +
  '<p class="lead">النسبة محسوبة من ' + S.total_questions + ' سؤالاً وزارياً عبر ' + SPAN + ' سنة.</p>\n' +
  '<div class="card"><table>\n' +
  '<tr><th>الفصل</th><th>الوزن</th><th></th><th>التقدير</th><th>عدد الأسئلة</th></tr>\n' +
  chapterRows + '\n</table></div>\n\n' +
  '<h2><span class="n">٢</span> أولويات المراجعة</h2>\n' +
  '<p class="lead">مرتّبة حسب عدد السنوات التي ظهر فيها الموضوع — ابدأ بالعمود الأخضر.</p>\n' +
  '<div class="prio">\n' +
  '  <div class="pcol" style="border-top-color:#0f9d58"><h3>🟢 شبه مضمونة</h3>' +
  '<div class="sub">تظهر كل سنة تقريباً</div><ul>' +
  prioCol(S.priority.must, (t) => t.yc + "/" + SPAN + " سنة · " + t.count + " سؤال") + '</ul></div>\n' +
  '  <div class="pcol" style="border-top-color:#e8a317"><h3>🟡 متناوبة</h3>' +
  '<div class="sub">تظهر سنة وتغيب أخرى</div><ul>' +
  prioCol(S.priority.rotate.slice(0, 12), (t) => t.yc + "/" + SPAN) + '</ul></div>\n' +
  '  <div class="pcol" style="border-top-color:#d64550"><h3>🔴 مرشّحة للعودة</h3>' +
  '<div class="sub">غابت سنوات ويُتوقّع رجوعها</div><ul>' +
  prioCol(S.priority.comeback, (t) => "آخر ظهور " + t.last) + '</ul></div>\n' +
  '</div>\n\n' +
  '<h2><span class="n">٣</span> ما أنواع الأسئلة التي تأتي فعلاً؟</h2>\n' +
  '<p class="lead">كثير من الطلاب يركّزون على المسائل الحسابية وحدها — والأرقام تقول إنها أقل من سُدس الورقة.</p>\n' +
  '<div class="card"><table>\n' +
  '<tr><th>نوع السؤال</th><th>العدد</th><th></th><th>النسبة</th></tr>\n' +
  typeRows + '\n</table></div>\n\n' +
  '<div class="contact">\n' +
  '  <div class="cname">' + CONTACT.name + '</div>\n' +
  '  <div class="crow"><span>📞 ' + CONTACT.phone + '</span><span>✉️ ' + CONTACT.email + '</span></div>\n' +
  '  <div class="csite">🌐 ' + CONTACT.site + '</div>\n' +
  '</div>\n\n' +
  '<footer>مبنية على ' + S.total_questions + ' سؤالاً وزارياً (' + S.span_label + ') · تُحدَّث بعد كل دور امتحاني</footer>\n' +
  '</div>\n';

// صفحة إحصاءات للأستاذ لا للطالب — تُولَّد خارج مجلد الموقع حتى لا تُرفع بالخطأ
const out = process.argv[2] || path.join(ROOT, "..", "شرارة-نسخ-المعلم", "preview-g3.html");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, "utf8");
console.log("✅ صفحة الثالث متوسط وُلِّدت → " + out);
console.log("   " + S.total_questions + " سؤالاً · " + SPAN + " سنة · " +
  S.priority.must.length + " موضوعاً شبه مضمون");
