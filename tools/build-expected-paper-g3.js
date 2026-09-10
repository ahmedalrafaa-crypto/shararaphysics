#!/usr/bin/env node
/**
 * توليد «ورقة الامتحان المتوقّعة» للثالث المتوسط — بصيغة قابلة للطباعة PDF.
 *
 * قاعدة صارمة: لا يُؤلَّف أي سؤال.
 *  - كل فرع يشير إلى سؤال وزاري منقول حرفياً في data/wazariyat-thalith-mutawassit.json.
 *  - يرفض البناء أي معرّف غير موجود، أو نصّه فارغ، أو عليه needs_review.
 * ما نضيفه: الترتيب، وسطر «انتبه»، والبدائل المرتّبة (أسماء مواضيع لا أسئلة)، والقاعدة.
 * تحويلات عرض فقط: حذف تعليمات الفرع المكرّرة داخل نصّ كل بند، وتسطير «ما تحته خط»
 * كما سُجّل في حقل notes أثناء النقل.
 *
 * المدخلات: data/expected-papers-g3.json (الورقة المفتوحة status: "open")
 * الاستعمال:
 *   node tools/build-expected-paper-g3.js                     ← نسخة الطالب (بلا مصادر ولا تبريرات)
 *   node tools/build-expected-paper-g3.js out.html --teacher  ← نسخة المعلّم
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const TEACHER = process.argv.includes("--teacher");
// نسخة المعلّم (أجوبة + مصادر) تُكتب خارج مجلد الموقع حتى لا تُرفع بالخطأ
const TEACHER_DIR = path.join(ROOT, "..", "شرارة-نسخ-المعلم");
const OUT = process.argv.slice(2).find((a) => !a.startsWith("--")) ||
  (TEACHER ? path.join(TEACHER_DIR, "expected-paper-teacher-g3.html") : path.join(ROOT, "predictions", "expected-paper.html"));
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const ALL = readJSON("wazariyat-thalith-mutawassit.json").questions;
const BANK = Object.fromEntries(ALL.map((q) => [q.id, q]));
const PAPER = readJSON("expected-papers-g3.json").papers.find((p) => p.status === "open");
if (!PAPER) throw new Error("لا توجد ورقة مفتوحة (status: \"open\") في data/expected-papers-g3.json");

const ROUND_AR = { 0: "التمهيدي", 1: "الدور الأول", 2: "الدور الثاني", 3: "الدور الثالث" };
const TARGET = ROUND_AR[PAPER.target.round] + " " + PAPER.target.year;
const LR = PAPER.last_round;
const LAST = ROUND_AR[LR.round] + " " + LR.year;

const CONTACT = {
  name: "الأستاذ أحمد رافع — فيزياء",
  phone: "07800155157",
  email: "ahmed.alrafaa@gmail.com",
  site: "shararaphysics.netlify.app",
};

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const srcLabel = (q) => "وزاري " + q.year + " — " + (ROUND_AR[q.round] || "") + " · " + q.question_number;

// ── تحقّق صارم قبل أي إخراج ─────────────────────────────────────────────
const problems = [];
PAPER.questions.forEach((q) => q.parts.forEach((p) => (p.ids || [p.id]).forEach((id) => {
  const b = BANK[id];
  if (!b) problems.push(id + ": غير موجود في البنك");
  else if (!b.question_text) problems.push(id + ": نصّه فارغ");
  else if (b.needs_review) problems.push(id + ": عليه needs_review — راجعه أولاً");
})));
if (problems.length) throw new Error("لا تُبنى الورقة:\n  " + problems.join("\n  "));

// ── عرض البند: حذف التعليمات المكرّرة + تسطير ما تحته خط ───────────────────
const LEAD = [
  /^ضع كلمة[\s\S]*?ما تحته خط\s*:\s*/,
  /^(علل|علّل)\s*:\s*/,
  /^(املأ الفراغ بما يناسبه|املأ الفراغ|أكمل بما يناسبها)\s*:\s*/,
];
const warnings = [];
function itemHtml(q, stripLead) {
  let t = q.question_text;
  if (stripLead) LEAD.forEach((re) => { t = t.replace(re, ""); });
  let h = esc(t);
  const m = /ما تحته خط[^:"(]*:?\s*["(]([^")]+)[")]/.exec(q.notes || "");
  if (m && h.includes(esc(m[1]))) h = h.replace(esc(m[1]), "<u>" + esc(m[1]) + "</u>");
  else if (/ضع كلمة/.test(q.question_text)) warnings.push(q.id + ": صح/خطأ بلا تسطير مسجّل");
  return h;
}

function renderAlternatives(p) {
  if (!p.alternatives || !p.alternatives.length) return "";
  const isActivity = p.alternatives.every((a) => a.group === "activity");
  return '<div class="alts"><div class="ahd">🔁 ' +
    (isActivity ? "إن جاء نشاط آخر — البدائل مرتّبة من الأرجح:" : "إن لم يأتِ هذا — البدائل مرتّبة من الأرجح:") + "</div><ol>" +
    p.alternatives.map((a) => '<li><span class="rk">' + a.rank + "</span><span>" + esc(a.label) +
      (TEACHER && a.why ? '<span class="why">' + esc(a.why) + "</span>" : "") + "</span></li>").join("") +
    "</ol></div>";
}

function renderPart(p) {
  let h = '<div class="part"><div class="phead">';
  if (p.label) h += '<span class="plabel">(' + esc(p.label) + ")</span>";
  if (p.instruction) h += '<span class="pinstr">' + esc(p.instruction) + "</span>";
  if (TEACHER && p.rule) h += '<span class="rule">' + esc(p.rule) + "</span>";
  h += '<span class="marks">' + p.marks + " درجات</span></div>";
  if (p.ids) {
    h += '<ol class="subs">' + p.ids.map((i) => {
      const q = BANK[i];
      return "<li>" + itemHtml(q, !!p.instruction) +
        (q.options ? '<div class="opts">( ' + q.options.map(esc).join(" &nbsp;·&nbsp; ") + " )</div>" : "") +
        (TEACHER ? '<span class="src">' + esc(srcLabel(q)) + "</span>" : "") + "</li>";
    }).join("") + "</ol>";
  } else {
    const q = BANK[p.id];
    h += '<div class="qtext">' + itemHtml(q, false) + "</div>";
    if (TEACHER) h += '<div class="src block">📄 ' + esc(srcLabel(q)) + "</div>";
  }
  if (p.change) h += '<div class="change">📌 <b>انتبه:</b> ' + p.change + "</div>";
  if (TEACHER && p.why) h += '<div class="pwhy">🧠 <b>لماذا:</b> ' + esc(p.why) + "</div>";
  return h + renderAlternatives(p) + "</div>";
}

// ── كم من ورقة الدور السابق كان له قالب في بنكنا قبله؟ ─────────────────────
// ليس نتيجة توقّع مسبق — بل مقياس لقابلية الورقة للتوقّع من الأوراق السابقة.
const norm = (s) => String(s || "").replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا")
  .replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^ء-ي ]/g, " ").replace(/\s+/g, " ").trim();
const STOP = /^(مما|ياتي|اثنين|اثنتين|لاثنتين|فقط|الذي|التي|على|الى|من|في|عن|مع|ما|هل|احسب|مقدار|علل|قارن|بين)$/;
const toks = (s) => new Set(norm(s).split(" ").filter((w) => w.length > 2 && !STOP.test(w)));
function sim(a, b) {
  const A = toks(a), B = toks(b);
  let i = 0; A.forEach((w) => { if (B.has(w)) i++; });
  return i / Math.max(1, Math.min(A.size, B.size));
}
const lastItems = ALL.filter((q) => q.year === LR.year && q.round === LR.round && q.question_text);
const earlier = ALL.filter((q) => !(q.year === LR.year && q.round === LR.round) && q.question_text);
const COV = lastItems.map((q) => {
  let best = null, s = 0;
  earlier.forEach((p) => { const v = sim(q.question_text, p.question_text); if (v > s) { s = v; best = p; } });
  return { q, best, s, hit: s >= 0.5 };
});
const covHit = COV.filter((c) => c.hit).length;
const covPct = lastItems.length ? Math.round(100 * covHit / lastItems.length) : 0;

function renderCoverage() {
  if (!lastItems.length) return "";
  const fresh = COV.filter((c) => !c.hit);
  return '<section class="sec cov"><h2>🔎 ' + esc(LAST) + ': كم كان في متناول الأوراق السابقة؟</h2>' +
    '<div class="kpis"><div class="kpi"><b>' + covHit + " / " + lastItems.length + "</b><span>فرعاً في " + esc(LAST) +
    ' كان له قالب في أوراق وزارية سابقة</span></div><div class="kpi"><b>' + covPct + '%</b><span>من فروع الورقة الحقيقية</span></div></div>' +
    '<p class="lead">هذا مقياس لا ادّعاء: ليس نسبة تطابق ورقة توقّعناها مسبقاً، بل كم من فروع الورقة الحقيقية كان له مثيل في الأوراق التي سبقتها. ' +
    "<b>نسبة تطابق هذه الورقة مع " + esc(TARGET) + " سننشرها كما هي بعد الامتحان.</b></p>" +
    (fresh.length ? '<details open><summary>فروع جاءت في ' + esc(LAST) + " بلا سابقة — تدرّب عليها (" + fresh.length + ")</summary><ol class=\"subs\">" +
      fresh.map((c) => "<li>" + esc(c.q.question_text) + "</li>").join("") + "</ol></details>" : "") +
    (TEACHER ? '<details><summary>كل الفروع وأقرب سابقة لكل منها</summary><ul class="sitems">' +
      COV.map((c) => "<li>" + (c.hit ? "✅" : "🆕") + " " + esc(c.q.question_number) + " — " + Math.round(100 * c.s) + "% · " +
        (c.best ? esc(srcLabel(c.best)) : "—") + "</li>").join("") + "</ul></details>" : "") +
    "</section>";
}

const body = PAPER.questions.map((q) =>
  '<section class="q"><div class="qhead"><span class="qn">السؤال ' + esc(q.n) + "</span>" +
  '<span class="qtopic">' + esc(q.topic) + "</span>" +
  (q.parts.some((p) => p.rule === "R4") ? '<span class="qflag">🎯 فيه الفصل الغائب عن الدورين الأول والثاني</span>' : "") +
  '<span class="qmarks">20 درجة</span></div>' + q.parts.map(renderPart).join("") + "</section>").join("");

const CSS = [
  ":root{--ink:#16203a;--soft:#5a6485;--line:#dfe3f0;--bg:#f6f7fb;--blue:#2b3f8f;--violet:#6b3fa8;--green:#0f9d58}",
  "*{box-sizing:border-box}",
  'body{margin:0;font-family:"Segoe UI",Tahoma,sans-serif;background:var(--bg);color:var(--ink);direction:rtl;line-height:1.9}',
  ".wrap{max-width:900px;margin:0 auto;padding:16px}",
  "header{background:linear-gradient(135deg,#2b3f8f,#6b3fa8);color:#fff;border-radius:16px;padding:22px;margin-bottom:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
  "header h1{margin:0 0 4px;font-size:1.42rem}",
  "header .rd{font-size:1rem;opacity:.95;font-weight:700}",
  "header .instr{margin-top:12px;background:rgba(255,255,255,.16);border-radius:10px;padding:9px 13px;font-size:.88rem;font-weight:700}",
  ".bar{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px}",
  ".btn{border:0;border-radius:10px;padding:11px 20px;font-family:inherit;font-size:.9rem;font-weight:800;cursor:pointer;background:var(--blue);color:#fff}",
  ".note{background:#fff8e6;border:1px solid #f0d79a;border-inline-start:5px solid #e8a317;border-radius:12px;padding:13px 15px;margin-bottom:16px;font-size:.87rem}",
  ".q{background:#fff;border:1px solid var(--line);border-radius:14px;margin-bottom:16px;overflow:hidden}",
  ".qhead{background:#eef1f9;padding:11px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--line)}",
  ".qn{font-weight:900;color:var(--blue);font-size:1rem}",
  ".qtopic{font-size:.78rem;background:var(--violet);color:#fff;border-radius:999px;padding:2px 11px;font-weight:700}",
  ".qflag{font-size:.75rem;background:var(--green);color:#fff;border-radius:999px;padding:2px 11px;font-weight:800}",
  ".qmarks{margin-inline-start:auto;font-size:.78rem;font-weight:800;color:var(--soft)}",
  ".part{padding:14px 16px;border-bottom:1px dashed var(--line)}",
  ".part:last-child{border-bottom:0}",
  ".phead{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:7px}",
  ".plabel{font-weight:900;color:var(--blue)}",
  ".pinstr{font-weight:700;font-size:.93rem}",
  ".rule{font-size:.7rem;background:#efe8fb;color:var(--violet);border-radius:999px;padding:1px 8px;font-weight:800}",
  ".marks{margin-inline-start:auto;font-size:.72rem;font-weight:800;color:#fff;background:var(--soft);border-radius:999px;padding:2px 10px;white-space:nowrap}",
  ".qtext{font-size:.97rem;font-weight:600}",
  ".subs{margin:6px 0 0;padding-inline-start:22px}",
  ".subs li{margin-bottom:9px;font-size:.94rem;font-weight:600}",
  "u{text-decoration-thickness:2px;text-underline-offset:5px}",
  ".opts{font-weight:500;color:var(--soft);font-size:.88rem;margin-top:3px}",
  ".src{display:inline-block;font-size:.72rem;font-weight:700;color:#0b7c46;background:#eafaf1;border-radius:999px;padding:2px 10px;margin-top:5px}",
  ".src.block{display:block;width:fit-content;margin-top:8px}",
  ".change{margin-top:9px;background:#f3f0fa;border-inline-start:3px solid var(--violet);border-radius:0 9px 9px 0;padding:8px 12px;font-size:.86rem}",
  ".pwhy{margin-top:7px;font-size:.8rem;color:#4b2d7a;background:#f8f4fe;border:1px dashed #d9c9f2;border-radius:9px;padding:7px 11px}",
  ".alts{margin-top:9px;background:#f7f9ff;border:1px dashed #c9d3f0;border-radius:10px;padding:8px 12px;font-size:.86rem}",
  ".alts .ahd{font-weight:800;color:var(--blue);margin-bottom:4px}",
  ".alts ol{margin:0;padding:0;list-style:none}",
  ".alts li{display:flex;gap:8px;align-items:baseline;padding:3px 0}",
  ".rk{flex:none;width:21px;height:21px;border-radius:50%;background:var(--blue);color:#fff;font-size:.72rem;font-weight:900;display:inline-flex;align-items:center;justify-content:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
  ".why{display:block;font-size:.76rem;color:var(--soft)}",
  ".sec{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:16px}",
  ".sec h2{margin:0 0 6px;font-size:1.05rem}",
  ".sec .lead{font-size:.85rem;color:var(--soft);margin:6px 0 10px}",
  ".cov{border-inline-start:5px solid var(--green)}",
  ".kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:10px 0}",
  ".kpi{background:#f4f6fb;border-radius:10px;padding:8px 10px;text-align:center}",
  ".kpi b{display:block;font-size:1.3rem;color:var(--blue);direction:ltr}",
  ".kpi span{font-size:.75rem;color:var(--soft);font-weight:700;line-height:1.5;display:block}",
  "details{margin:6px 0}",
  "details summary{cursor:pointer;font-weight:800;color:var(--blue);font-size:.86rem}",
  ".sitems{list-style:none;margin:8px 0 0;padding:0;font-size:.84rem}",
  ".sitems li{padding:3px 0;border-bottom:1px dashed var(--line)}",
  ".consts{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 16px;font-size:.85rem;color:var(--soft);margin-top:6px}",
  ".contact{background:linear-gradient(135deg,#2b3f8f,#6b3fa8);color:#fff;border-radius:14px;padding:16px 18px;margin-top:16px;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}",
  ".contact .cname{font-weight:900;font-size:1.02rem;margin-bottom:7px}",
  ".contact .crow{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;font-size:.92rem;font-weight:700}",
  ".contact .csite{margin-top:7px;font-size:.9rem;font-weight:800;direction:ltr}",
  "footer{text-align:center;color:var(--soft);font-size:.8rem;margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}",
  "@media print{body{background:#fff}.bar{display:none}.q,.sec,.contact{break-inside:avoid}details{display:block}}",
].join("\n");

// بلا وسم viewport يعرض الهاتف الصفحة بعرض سطح المكتب مصغّراً — والموقع موبايل أولاً
const html =
  '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  "<title>ورقة الامتحان المتوقّعة — " + TARGET + " — الثالث المتوسط</title>\n" +
  "<style>\n" + CSS + "\n</style>\n\n" +
  '<div class="wrap">\n<header>\n' +
  "  <h1>📄 ورقة الامتحان المتوقّعة</h1>\n" +
  '  <div class="rd">' + TARGET + " — الثالث المتوسط · " + CONTACT.name + "</div>\n" +
  '  <div class="instr">ملاحظة: أجب عن خمسة أسئلة فقط، ولكل سؤال (20) درجة.  الزمن: ثلاث ساعات.</div>\n' +
  "</header>\n\n" +
  '<div class="bar"><button class="btn" onclick="window.print()">🖨️ حفظ PDF / طباعة</button></div>\n\n' +
  '<div class="note"><b>📖 كيف تستفيد منها:</b> كل سؤال هنا <b>جاء فعلاً في امتحان وزاري سابق</b>. تحته <b>📌 انتبه</b>: ما الذي سيتغيّر فيه، و<b>🔁 البدائل</b>: ما قد يأتي بدلَه مرتّباً من الأرجح. ' +
  "<b>تدرّب على الطريقة لا على الرقم.</b><br>⚠️ هذه <b>توقعات دراسية — ليست أسئلة مسرّبة ولا مضمونة</b>." +
  (PAPER.note ? "<br>🗓️ " + esc(PAPER.note) : "") + "</div>\n\n" +
  body + "\n\n" + renderCoverage() + "\n\n" +
  '<div class="consts"><b>ثوابت تُعطى عادةً بالورقة:</b><br>ثابت كولوم K = 9×10⁹ N·m²/C²</div>\n\n' +
  '<div class="contact"><div class="cname">' + CONTACT.name + '</div><div class="crow"><span>📞 ' + CONTACT.phone +
  "</span><span>✉️ " + CONTACT.email + '</span></div><div class="csite">🌐 ' + CONTACT.site + "</div></div>\n\n" +
  "<footer>ورقة متوقّعة مبنية على أسئلة وزارية حقيقية (2018–2026) · تُحدَّث وتُقيَّم علناً بعد كل دور امتحاني</footer>\n" +
  "</div>\n" +
  // القفل لنسخة الطالب فقط — نسخة المعلّم تُولَّد خارج الموقع ولا تُرفع أصلاً
  (TEACHER ? '' : '<script src="../js/access-control.js"></script>\n');

fs.writeFileSync(OUT, html, "utf8");
const ids = PAPER.questions.flatMap((q) => q.parts.flatMap((p) => p.ids || [p.id]));
const nAlt = PAPER.questions.reduce((a, q) => a + q.parts.reduce((b, p) => b + (p.alternatives || []).length, 0), 0);
console.log("✅ الورقة المتوقّعة للثالث (" + TARGET + ") → " + OUT + (TEACHER ? "  [نسخة المعلّم]" : ""));
console.log("   " + PAPER.questions.length + " أسئلة · " + ids.length + " بنداً وزارياً · " + nAlt + " بديلاً مرتّباً");
console.log("   " + LAST + ": " + covHit + " من " + lastItems.length + " فرعاً (" + covPct + "%) كان له قالب في الأوراق السابقة");
if (warnings.length) console.log("⚠️ " + warnings.join("\n⚠️ "));
