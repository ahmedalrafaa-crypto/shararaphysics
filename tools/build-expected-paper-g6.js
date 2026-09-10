#!/usr/bin/env node
/**
 * توليد «ورقة الامتحان المتوقّعة» للسادس العلمي — بصيغة قابلة للطباعة PDF.
 *
 * قاعدة صارمة: لا يُؤلَّف أي سؤال ولا أي جواب.
 *  - كل سؤال منقول حرفياً من ورقة وزارية حقيقية (data/wazariyat-sadis-ilmi.json).
 *  - كل جواب مأخوذ حرفياً من كشف الأجوبة النموذجية الرسمي، وإن لم يتوفّر نصرّح بغيابه.
 * ما نضيفه نحن: الترتيب، وسطر «انتبه»، والبدائل المرتّبة، وخريطة المنهج، وبنك
 * المصطلحات (أسماء مصطلحات تُحال إلى دروسها — لا تعريفات مؤلَّفة).
 *
 * المدخلات:
 *   data/expected-papers-g6.json     الورقة المفتوحة (status: "open")
 *   data/predictions-ledger-g6.json  نتيجة آخر دور مقيَّم + حالة كل مفهوم
 *   data/concept-tags-g6.json        المفاهيم ودروسها
 *   data/terms-g6.json               مصطلحات المنهج
 *
 * الاستعمال (بعد كل دور امتحاني):
 *   node tools/feedback-predictions-g6.js                       ← أولاً: يقيّم ويحدّث السجلّ
 *   node tools/build-expected-paper-g6.js                       ← نسخة الطالب (بلا مصادر ولا أجوبة)
 *   node tools/build-expected-paper-g6.js out.html --teacher    ← نسخة المعلّم
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

// نسخة الطالب (الافتراضية): بلا مصادر وبلا أجوبة وبلا تبريرات — لا تُطبَع في الـHTML أصلاً.
const TEACHER = process.argv.includes("--teacher");
// نسخة المعلّم (أجوبة رسمية + مصادر + تبريرات) تُكتب خارج مجلد الموقع دائماً، كي لا تُرفع بالغلط.
const TEACHER_DIR = path.join(ROOT, "..", "شرارة-نسخ-المعلم");
const OUT = process.argv.slice(2).find((a) => !a.startsWith("--")) ||
  (TEACHER ? path.join(TEACHER_DIR, "expected-paper-teacher-g6.html") : path.join(ROOT, "predictions-g6", "expected-paper.html"));
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// روابط الدروس: نسبية داخل الموقع، ومطلقة للموقع الحي حين تُفتح النسخة من خارجه
const SITE = TEACHER ? "https://shararaphysics.netlify.app/" : "../";

const BANK = {};
readJSON("wazariyat-sadis-ilmi.json").questions.forEach((q) => { BANK[q.id] = q; });

// الأجوبة النموذجية الرسمية، مفهرسة بمعرّف السؤال
const ANS = {};
["wazariyat-sadis-ilmi-answers-2026r1.json"].forEach((f) => {
  const p = path.join(ROOT, "data", f);
  if (!fs.existsSync(p)) return;
  JSON.parse(fs.readFileSync(p, "utf8")).answers.forEach((a) => {
    if (!a.question_id) return;
    (ANS[a.question_id] = ANS[a.question_id] || []).push(a);
  });
});

const PAPERS = readJSON("expected-papers-g6.json");
const LEDGER = readJSON("predictions-ledger-g6.json");
const TAGS = readJSON("concept-tags-g6.json");
const TERMS = readJSON("terms-g6.json");
const QBANK = readJSON("qbank-g6.json");

const PAPER = PAPERS.papers.find((p) => p.status === "open");
if (!PAPER) throw new Error("لا توجد ورقة مفتوحة (status: \"open\") في data/expected-papers-g6.json");
const SCORED = LEDGER.scored[LEDGER.scored.length - 1] || null;

const ROUND_AR = { 0: "التمهيدي", 1: "الدور الأول", 2: "الدور الثاني", 3: "الدور الثالث" };
const TARGET = ROUND_AR[PAPER.target.round] + " " + PAPER.target.year;
const LAST = LEDGER.last_round.label;
const CH = {
  1: "المتسعات", 2: "الحث الكهرومغناطيسي والذاتي", 3: "التيار المتناوب",
  4: "الموجات الكهرومغناطيسية", 5: "البصريات الفيزيائية", 6: "الفيزياء الحديثة",
  7: "إلكترونيات الحالة الصلبة", 8: "الأطياف الذرية والليزر", 9: "الفيزياء النووية",
};

// بيانات التواصل — تظهر في الصفحة وتُطبع مع ملف الـPDF
const CONTACT = {
  name: "الأستاذ أحمد رافع — فيزياء",
  phone: "07800155157",
  email: "ahmed.alrafaa@gmail.com",
  site: "shararaphysics.netlify.app",
};

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
function srcLabel(q) {
  return "وزاري " + q.year + " — " + (ROUND_AR[q.round] || "") +
    (q.track && q.track !== "موحد" ? " (" + q.track + ")" : "") + " · " + q.question_number;
}

// ── الدروس: عناوينها ونصوصها (لإحالة المصطلحات إلى دروسها) ────────────────
global.window = {};
require(path.join(ROOT, "js", "lessons-data-g6.js"));
const LESSONS = window.PHY_LESSONS
  .filter((l) => !/أسئلة ومسائل/.test(l.lesson_title))
  .map((l) => ({
    key: l.chapter_number + "-L" + l.lesson_number, ch: +l.chapter_number.slice(3), n: l.lesson_number,
    title: l.lesson_title, href: SITE + "chapters/" + l.chapter_number + "/lesson" + l.lesson_number + ".html",
  }));

// تطبيع عربي: بلا تشكيل ولا تطويل، وتوحيد الهمزات والتاء المربوطة والألف المقصورة
const norm = (s) => String(s || "")
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/[ً-ْـ]/g, "")
  .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
  .replace(/\s+/g, " ");
const LESSON_TEXT = {};
LESSONS.forEach((l) => {
  const f = path.join(ROOT, "chapters", "g6c" + l.ch, "lesson" + l.n + ".html");
  LESSON_TEXT[l.key] = fs.existsSync(f) ? norm(fs.readFileSync(f, "utf8")) : "";
});

// مطابقة كلمة كاملة، مع السوابق الشائعة (و، ب، ل، لل…) — كي لا تطابق «القابل» كلمة «المقابل»
function termRe(alias) {
  const a = norm(alias).trim();
  const forms = [a];
  if (a.startsWith("ال")) forms.push("لل" + a.slice(2));
  // الصيغة النكرة أيضاً: «الضوء المستقطب» ← «ضوء مستقطب»
  const bare = a.split(" ").map((w) => (w.startsWith("ال") && w.length > 3 ? w.slice(2) : w)).join(" ");
  if (bare !== a) forms.push(bare);
  const body = forms.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp("(^|[^\\u0621-\\u064A])(?:و|ف)?(?:ب|ك|ل)?(?:" + body + ")(?=$|[^\\u0621-\\u064A])");
}

// كل نص سؤال وزاري نملكه — للحكم: هل سُئل عن المصطلح من قبل؟
const ASKED = [];
Object.values(BANK).forEach((q) => {
  if (!q.question_text) return;
  ASKED.push({ t: norm(q.question_text), define: /المقصود/.test(q.question_text), label: srcLabel(q) });
});
QBANK.items.filter((q) => q.ministerial).forEach((q) => {
  ASKED.push({ t: norm(q.question), define: /المقصود/.test(q.question), label: "وزاري" + (q.year ? " " + q.year : "") });
});

const termWarnings = [];
const TERM_ROWS = Object.entries(TERMS.chapters).map(([ch, list]) => ({
  ch: +ch,
  terms: list.map((raw) => {
    const aliases = raw.split("|");
    const res = aliases.map(termRe);
    const inLesson = (l) => res.some((r) => r.test(LESSON_TEXT[l.key]));
    // درس الفصل نفسه أولاً، ثم أي درس آخر (المستوى المثار مثلاً مشروح في الفصل السابع)
    const lesson = LESSONS.filter((l) => l.ch === +ch).find(inLesson) || LESSONS.find(inLesson);
    if (!lesson) termWarnings.push("ف" + ch + ": «" + aliases[0] + "» لم يوجد في أي درس بالموقع");
    const hits = ASKED.filter((a) => res.some((r) => r.test(a.t)));
    const def = hits.filter((h) => h.define);
    return {
      name: aliases[0], lesson,
      status: def.length ? "defined" : hits.length ? "asked" : "new",
      labels: Array.from(new Set((def.length ? def : hits).map((h) => h.label))).slice(0, 4),
    };
  }),
}));

// ── حالة كل درس بعد آخر دور (من حالة مفاهيمه في السجلّ) ─────────────────
const RANK = { "just-used": 3, recent: 2, due: 1, never: 0 };
function lessonState(key) {
  const cs = Object.values(LEDGER.concepts).filter((c) => c.lesson === key);
  if (!cs.length || cs.every((c) => c.status === "never")) return "never";
  const s = cs.map((c) => c.status).filter((x) => x !== "never").sort((a, b) => RANK[b] - RANK[a]);
  return { "just-used": "used", recent: "recent", due: "due" }[s[0]];
}

// ── الأجوبة (نسخة المعلّم فقط) ─────────────────────────────────────────
function renderAnswers(ids) {
  if (!TEACHER) return "";
  const withAns = ids.filter((i) => ANS[i]);
  if (!withAns.length) {
    return '<div class="noans">📌 جواب هذا الفرع غير متوفّر عندنا من كشف وزاري رسمي — راجعه في الملزمة.</div>';
  }
  let h = '<div class="ans"><div class="ahead">✅ الجواب النموذجي الرسمي</div>';
  withAns.forEach((i) => {
    ANS[i].forEach((a) => {
      const q = BANK[i];
      h += '<div class="aitem">' +
        (ids.length > 1 ? '<div class="afor">' + esc(q.question_text.slice(0, 70)) + '…</div>' : '') +
        (a.method_label ? '<div class="amethod">' + esc(a.method_label) + '</div>' : '') +
        '<ol class="asteps">' + a.answer_steps.map((s) => '<li>' + esc(s) + '</li>').join("") + '</ol>' +
        '<div class="ameta">📘 ' + esc(a.chapter_ref || "—") +
          (a.textbook_page_ref ? ' · ' + esc(a.textbook_page_ref) : '') +
          (a.marks_breakdown ? ' · توزيع الدرجة: ' + esc(a.marks_breakdown) : '') + '</div>' +
        '</div>';
    });
  });
  return h + '<div class="asrc">مصدر الأجوبة: كشف الأجوبة النموذجية الرسمي — الدور الأول 2026 (وزارة التربية)</div></div>';
}

function renderAlternatives(p) {
  if (!p.alternatives || !p.alternatives.length) return "";
  const isActivity = p.alternatives.every((a) => a.group === "activity");
  return '<div class="alts"><div class="ahd">🔁 ' +
    (isActivity ? 'إن جاء نشاط آخر — البدائل مرتّبة من الأرجح:' : 'إن لم يأتِ هذا — البدائل مرتّبة من الأرجح:') + '</div><ol>' +
    p.alternatives.map((a) => '<li><span class="rk">' + a.rank + '</span><span>' + esc(a.label) +
      (TEACHER && a.why ? '<span class="why">' + esc(a.why) + '</span>' : '') + '</span></li>').join("") +
    '</ol></div>';
}

function renderPart(p) {
  const label = p.label.replace("-", ") ").replace(/^/, "(") + (p.label.includes("-") ? "" : ")");
  let h = '<div class="part"><div class="phead"><span class="plabel">' + esc(label) + '</span>';
  if (p.instruction) h += '<span class="pinstr">' + esc(p.instruction) + '</span>';
  if (TEACHER && p.rule) h += '<span class="rule">' + esc(p.rule) + '</span>';
  h += '<span class="marks">' + p.marks + ' درجات</span></div>';

  const ids = p.ids || (p.id ? [p.id] : []);
  const missing = ids.filter((i) => !BANK[i]);
  if (missing.length) throw new Error("معرّف غير موجود في البنك: " + missing.join(", "));

  if (p.ids) {
    h += '<ol class="subs">';
    p.ids.forEach((i) => {
      const q = BANK[i];
      h += '<li>' + esc(q.question_text) +
        (q.options ? '<div class="opts">( ' + q.options.map(esc).join(" &nbsp;·&nbsp; ") + ' )</div>' : '') +
        (TEACHER ? '<span class="src">' + esc(srcLabel(q)) + '</span>' : '') + '</li>';
    });
    h += '</ol>';
  } else {
    const q = BANK[p.id];
    h += '<div class="qtext">' + esc(q.question_text) + '</div>';
    if (TEACHER) h += '<div class="src block">📄 ' + esc(srcLabel(q)) + '</div>';
  }
  if (p.change) h += '<div class="change">📌 <b>انتبه:</b> ' + p.change + '</div>';
  if (TEACHER && p.why) h += '<div class="pwhy">🧠 <b>لماذا:</b> ' + esc(p.why) + '</div>';
  h += renderAlternatives(p);
  h += renderAnswers(ids);
  return h + '</div>';
}

// ── نتيجة توقعاتنا للدور السابق ─────────────────────────────────────────
function renderScore() {
  if (!SCORED) return "";
  const s = SCORED.summary, c = SCORED.cov, R = LEDGER.rules;
  const OUTC = { hit: ["✅", "أصاب"], alt: ["✅", "أصاب ببديل"], partial: ["🟡", "جاء بصيغة أخرى"], miss: ["❌", "لم يأتِ"] };
  const hitN = s.hit + s.alt;
  const learned = [
    'المسائل الكبرى: عاد القالب نفسه في <b>' + s.big_hit + ' من ' + s.big_total + '</b>' +
      (s.variant_checked ? '، وتغيّر شكلها كما توقّعنا في ' + s.variant_changed + ' من ' + s.variant_checked : '') +
      ' ← أبقينا هذه الطريقة، ووضعنا تحت كل مسألة أربعة بدائل مرتّبة.',
    'الأسئلة النظرية المأخوذة من أوراق سابقة أصابت <b>' + R.R3.hits + ' من ' + R.R3.total + '</b> فقط ← أضفنا خريطة المنهج كاملة وبنك المصطلحات، وبدائل تحت كل فرع.',
    '<b>' + c.novel_pct + '%</b> من فروع ' + esc(SCORED.label) + ' مواضيع لم تُسأل في أي ورقة سابقة عندنا ← هذه لا يتوقّعها أي تكرار؛ دفاعك الوحيد أن تغطّي كل الدروس.',
    'قاعدة «الفصل الغائب يعود» أصابت <b>' + R.R4.hits + ' من ' + R.R4.total + '</b> — الفيزياء النووية غابت للمرة الثانية ← نزّلناها من سؤال كامل إلى بدائل.',
  ];
  return '<section class="score">' +
    '<h2>📊 نتيجة توقعاتنا ل' + esc(SCORED.label.replace(/^ال/, "ل")) + ' — نعلنها كما هي</h2>' +
    '<div class="kpis">' +
      '<div class="kpi"><b>' + s.big_hit + ' / ' + s.big_total + '</b><span>المسائل والأنشطة الكبرى</span></div>' +
      '<div class="kpi"><b>' + s.marks_pct + '%</b><span>من درجات ورقتنا جاء فعلاً</span></div>' +
      '<div class="kpi"><b>' + hitN + ' / ' + s.total + '</b><span>فرعاً أصاب من فروع ورقتنا</span></div>' +
      '<div class="kpi"><b>' + (c.main + c.alt) + ' / ' + c.total + '</b><span>من فروع الورقة الحقيقية كان عندنا</span></div>' +
    '</div>' +
    '<details><summary>اعرض كل فروع ورقتنا ونتيجتها</summary><ul class="sitems">' +
      SCORED.items.map((i) => '<li>' + OUTC[i.outcome][0] + ' <b>' + OUTC[i.outcome][1] + '</b> — ' + esc(i.label) +
        (TEACHER ? ' <span class="src">س ' + esc(i.q) + ' / ' + esc(i.part) + (i.rule ? ' · ' + i.rule : '') + '</span>' : '') + '</li>').join("") +
    '</ul></details>' +
    '<div class="learned"><b>ما الذي غيّرناه بناءً على هذه النتيجة:</b><ul>' + learned.map((l) => '<li>' + l + '</li>').join("") + '</ul></div>' +
    '</section>';
}

// ── أسئلة الدور السابق التي فاتت توقعاتنا — للتدرّب ───────────────────────
function renderMissed() {
  if (!SCORED) return "";
  const ids = Array.from(new Set(SCORED.coverage.filter((c) => c.covered === "none").map((c) => c.id)));
  if (!ids.length) return "";
  return '<section class="sec missed"><h2>🎯 ما فات توقعاتنا في ' + esc(SCORED.label) + ' — تدرّب عليه</h2>' +
    '<p class="lead">هذه فروع جاءت في الورقة الحقيقية ولم تكن في ورقتنا. الوزارة تعيد مواضيعها بعد أدوار بصيغة أخرى — فلا تتركها.</p><ol>' +
    ids.map((i) => {
      const q = BANK[i];
      const c = TAGS.concepts[(TAGS.tags[i] || [])[0]];
      const l = c && LESSONS.find((x) => x.key === c[0]);
      return '<li>' + esc(q.question_text) +
        (l ? ' <a class="lk" href="' + l.href + '">📖 ' + esc(l.title) + '</a>' : '') +
        (TEACHER ? ' <span class="src">' + esc(srcLabel(q)) + '</span>' : '') + '</li>';
    }).join("") + '</ol></section>';
}

// ── خريطة المنهج: كل درس وحالته ────────────────────────────────────────
function renderMap() {
  const ST = {
    due: ["st-due", "غاب ثلاث أوراق فأكثر — مرشّح للعودة"],
    never: ["st-never", "لم يأتِ في الأوراق التي فحصناها (2024–2026) — لا تهمله"],
    recent: ["st-recent", "جاء في أوراق 2026 السابقة"],
    used: ["st-used", "جاء في " + LAST],
  };
  const rows = Object.keys(CH).map((ch) => {
    const ls = LESSONS.filter((l) => l.ch === +ch);
    return '<div class="chrow"><h3>ف' + ch + ' — ' + esc(CH[ch]) + '</h3><div class="chips">' +
      ls.map((l) => { const s = ST[lessonState(l.key)]; return '<a class="chip ' + s[0] + '" href="' + l.href + '" title="' + esc(s[1]) + '"><i></i>' + esc(l.title) + '</a>'; }).join("") +
      '</div></div>';
  }).join("");
  return '<section class="sec"><h2>🧭 خريطة المنهج — كل الدروس، ولا درس منسيّ</h2>' +
    '<p class="lead">الورقة أعلاه تتوقّع الأرجح، لكن كل ورقة وزارية فيها مواضيع جديدة لم تُسأل من قبل. هذه الخريطة تعرض كل دروس المنهج ولون كل درس يقول لك موقعه من الأسئلة الوزارية.</p>' +
    '<div class="legend">' + ["due", "never", "recent", "used"].map((k) => '<span class="' + ST[k][0] + '"><i></i>' + esc(ST[k][1]) + '</span>').join("") + '</div>' +
    rows + '</section>';
}

// ── بنك المصطلحات: ما المقصود / صح وخطأ ────────────────────────────────
function renderTerms() {
  const MK = { defined: ["t-def", "✔"], asked: ["t-ask", "↻"], new: ["t-new", "🆕"] };
  const total = TERM_ROWS.reduce((a, r) => a + r.terms.length, 0);
  const nNew = TERM_ROWS.reduce((a, r) => a + r.terms.filter((t) => t.status === "new").length, 0);
  return '<section class="sec"><h2>📚 بنك المصطلحات — لأسئلة «ما المقصود» و«صح وخطأ»</h2>' +
    '<p class="lead">' + total + ' مصطلحاً من كل فصول المنهج — لا ما تكرّر في آخر سنتين فقط. أسئلة «ما المقصود» و«صح وخطأ» تأتي على مصطلحات تتبدّل كل دور، و' + nNew +
    ' مصطلحاً منها لم يُسأل عنه بعد في أي سؤال وزاري عندنا. اضغط المصطلح لتفتح الدرس الذي يشرحه، واحفظ تعريفه من كتابك.</p>' +
    '<div class="legend"><span class="t-def">✔ سُئل «ما المقصود» عنه سابقاً</span><span class="t-ask">↻ ورد في سؤال وزاري بصيغة أخرى</span><span class="t-new">🆕 لم يُسأل بعد — مرشّح</span></div>' +
    TERM_ROWS.map((r) => '<div class="chrow"><h3>ف' + r.ch + ' — ' + esc(CH[r.ch]) + '</h3><div class="chips">' +
      r.terms.map((t) => {
        const cls = 'chip tchip ' + MK[t.status][0];
        const tip = TEACHER && t.labels.length ? ' title="' + esc(t.labels.join(" · ")) + '"' : '';
        const inner = '<span class="mk">' + MK[t.status][1] + '</span>' + esc(t.name);
        return t.lesson ? '<a class="' + cls + '" href="' + t.lesson.href + '"' + tip + '>' + inner + '</a>'
                        : '<span class="' + cls + '"' + tip + '>' + inner + '</span>';
      }).join("") + '</div></div>').join("") +
    '</section>';
}

const body = PAPER.questions.map((q) =>
  '<section class="q">' +
  '<div class="qhead"><span class="qn">السؤال ' + q.n + '</span>' +
  '<span class="qtopic">' + esc(q.topic) + '</span>' +
  (q.flag ? '<span class="qflag">🎯 ' + esc(q.flag) + '</span>' : '') +
  '<span class="qmarks">20 درجة</span></div>' +
  q.parts.map(renderPart).join("") +
  '</section>').join("");

const CSS = [
  ':root{--ink:#16203a;--soft:#5a6485;--line:#dfe3f0;--bg:#f6f7fb;--blue:#2b3f8f;--violet:#6b3fa8;--green:#0f9d58}',
  '*{box-sizing:border-box}',
  'body{margin:0;font-family:"Segoe UI",Tahoma,sans-serif;background:var(--bg);color:var(--ink);direction:rtl;line-height:1.9}',
  '.wrap{max-width:900px;margin:0 auto;padding:16px}',
  'header{background:linear-gradient(135deg,#2b3f8f,#6b3fa8);color:#fff;border-radius:16px;padding:22px;margin-bottom:14px;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
  'header h1{margin:0 0 4px;font-size:1.42rem}',
  'header .rd{font-size:1rem;opacity:.95;font-weight:700}',
  'header .instr{margin-top:12px;background:rgba(255,255,255,.16);border-radius:10px;padding:9px 13px;font-size:.88rem;font-weight:700}',
  '.bar{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:14px}',
  '.btn{border:0;border-radius:10px;padding:11px 20px;font-family:inherit;font-size:.9rem;font-weight:800;cursor:pointer;background:var(--blue);color:#fff}',
  '.btn.ghost{background:#fff;color:var(--blue);border:1px solid var(--line)}',
  '.btn:hover{opacity:.9}',
  '.note{background:#fff8e6;border:1px solid #f0d79a;border-inline-start:5px solid #e8a317;border-radius:12px;padding:13px 15px;margin-bottom:16px;font-size:.87rem}',
  '.score{background:#fff;border:1px solid var(--line);border-inline-start:5px solid var(--green);border-radius:14px;padding:14px 16px;margin-bottom:16px}',
  '.score h2,.sec h2{margin:0 0 6px;font-size:1.05rem}',
  '.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:10px 0}',
  '.kpi{background:#f4f6fb;border-radius:10px;padding:8px 10px;text-align:center}',
  '.kpi b{display:block;font-size:1.3rem;color:var(--blue);direction:ltr}',
  '.kpi span{font-size:.75rem;color:var(--soft);font-weight:700;line-height:1.5;display:block}',
  'details{margin:6px 0}',
  'details summary{cursor:pointer;font-weight:800;color:var(--blue);font-size:.86rem}',
  '.sitems{list-style:none;margin:8px 0 0;padding:0;font-size:.84rem}',
  '.sitems li{padding:3px 0;border-bottom:1px dashed var(--line)}',
  '.learned{margin-top:10px;font-size:.85rem}',
  '.learned ul{margin:4px 0 0;padding-inline-start:20px}',
  '.learned li{margin-bottom:3px}',
  '.q{background:#fff;border:1px solid var(--line);border-radius:14px;margin-bottom:16px;overflow:hidden}',
  '.qhead{background:#eef1f9;padding:11px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--line)}',
  '.qn{font-weight:900;color:var(--blue);font-size:1rem}',
  '.qtopic{font-size:.78rem;background:var(--violet);color:#fff;border-radius:999px;padding:2px 11px;font-weight:700}',
  '.qflag{font-size:.75rem;background:var(--green);color:#fff;border-radius:999px;padding:2px 11px;font-weight:800}',
  '.qmarks{margin-inline-start:auto;font-size:.78rem;font-weight:800;color:var(--soft)}',
  '.part{padding:14px 16px;border-bottom:1px dashed var(--line)}',
  '.part:last-child{border-bottom:0}',
  '.phead{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:7px}',
  '.plabel{font-weight:900;color:var(--blue)}',
  '.pinstr{font-weight:700;font-size:.93rem}',
  '.rule{font-size:.7rem;background:#efe8fb;color:var(--violet);border-radius:999px;padding:1px 8px;font-weight:800}',
  '.marks{margin-inline-start:auto;font-size:.72rem;font-weight:800;color:#fff;background:var(--soft);border-radius:999px;padding:2px 10px;white-space:nowrap}',
  '.qtext{font-size:.97rem;font-weight:600}',
  '.subs{margin:6px 0 0;padding-inline-start:22px}',
  '.subs li{margin-bottom:9px;font-size:.94rem;font-weight:600}',
  '.opts{font-weight:500;color:var(--soft);font-size:.88rem;margin-top:3px}',
  '.src{display:inline-block;font-size:.72rem;font-weight:700;color:#0b7c46;background:#eafaf1;border-radius:999px;padding:2px 10px;margin-top:5px}',
  '.src.block{display:block;width:fit-content;margin-top:8px}',
  'body.nosrc .src{display:none}',
  '.change{margin-top:9px;background:#f3f0fa;border-inline-start:3px solid var(--violet);border-radius:0 9px 9px 0;padding:8px 12px;font-size:.86rem}',
  '.pwhy{margin-top:7px;font-size:.8rem;color:#4b2d7a;background:#f8f4fe;border:1px dashed #d9c9f2;border-radius:9px;padding:7px 11px}',
  '.alts{margin-top:9px;background:#f7f9ff;border:1px dashed #c9d3f0;border-radius:10px;padding:8px 12px;font-size:.86rem}',
  '.alts .ahd{font-weight:800;color:var(--blue);margin-bottom:4px}',
  '.alts ol{margin:0;padding:0;list-style:none}',
  '.alts li{display:flex;gap:8px;align-items:baseline;padding:3px 0}',
  '.rk{flex:none;width:21px;height:21px;border-radius:50%;background:var(--blue);color:#fff;font-size:.72rem;font-weight:900;display:inline-flex;align-items:center;justify-content:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
  '.why{display:block;font-size:.76rem;color:var(--soft)}',
  '.ans{margin-top:11px;background:#eafaf1;border:1px solid #b9e6cd;border-radius:11px;padding:11px 14px}',
  '.ahead{font-weight:900;color:#0b7c46;font-size:.88rem;margin-bottom:6px}',
  '.aitem{padding:7px 0;border-bottom:1px dashed #b9e6cd}',
  '.aitem:last-of-type{border-bottom:0}',
  '.afor{font-size:.8rem;color:#0b7c46;font-weight:700;margin-bottom:4px}',
  '.amethod{font-size:.76rem;font-weight:800;color:var(--violet);margin-bottom:3px}',
  '.asteps{margin:0;padding-inline-start:20px;font-size:.88rem}',
  '.asteps li{margin-bottom:2px;unicode-bidi:plaintext}',
  '.ameta{font-size:.75rem;color:#0b7c46;margin-top:5px;font-weight:700}',
  '.asrc{font-size:.72rem;color:var(--soft);margin-top:7px;border-top:1px solid #b9e6cd;padding-top:6px}',
  '.noans{margin-top:11px;background:#f4f5fa;border:1px dashed #c8cee0;border-radius:11px;padding:9px 13px;font-size:.82rem;color:var(--soft)}',
  'body.noans-hide .ans,body.noans-hide .noans{display:none}',
  '.sec{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin-bottom:16px}',
  '.sec .lead{font-size:.85rem;color:var(--soft);margin:0 0 10px}',
  '.missed ol{margin:0;padding-inline-start:22px}',
  '.missed li{margin-bottom:9px;font-size:.92rem;font-weight:600}',
  '.lk{font-size:.74rem;font-weight:800;color:var(--blue);text-decoration:none;white-space:nowrap}',
  '.chrow{margin-bottom:12px}',
  '.chrow h3{font-size:.88rem;margin:0 0 6px;color:var(--blue)}',
  '.chips{display:flex;flex-wrap:wrap;gap:6px}',
  '.chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);border-radius:999px;padding:3px 11px;font-size:.8rem;font-weight:700;color:var(--ink);text-decoration:none;background:#fff;line-height:1.7}',
  'a.chip:hover{border-color:var(--blue)}',
  '.chip i,.legend i{width:9px;height:9px;border-radius:50%;display:inline-block;flex:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
  '.st-due i{background:#0f9d58}.st-never i{background:#9aa3c0}.st-recent i{background:#e8a317}.st-used i{background:#d64550}',
  '.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.78rem;color:var(--soft);font-weight:700;margin-bottom:12px}',
  '.legend span{display:inline-flex;align-items:center;gap:6px}',
  '.tchip .mk{font-size:.74rem}',
  '.t-def{background:#eafaf1;border-color:#b9e6cd}.t-ask{background:#f4f6fb}.t-new{background:#fff8e6;border-color:#f0d79a}',
  '.legend .t-def,.legend .t-ask,.legend .t-new{border-radius:999px;padding:1px 9px;border:1px solid var(--line)}',
  '.consts{background:#fff;border:1px solid var(--line);border-radius:12px;padding:13px 16px;font-size:.85rem;color:var(--soft);margin-top:6px}',
  '.contact{background:linear-gradient(135deg,#2b3f8f,#6b3fa8);color:#fff;border-radius:14px;padding:16px 18px;margin-top:16px;text-align:center;-webkit-print-color-adjust:exact;print-color-adjust:exact}',
  '.contact .cname{font-weight:900;font-size:1.02rem;margin-bottom:7px}',
  '.contact .crow{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;font-size:.92rem;font-weight:700}',
  '.contact .csite{margin-top:7px;font-size:.9rem;font-weight:800;direction:ltr}',
  'footer{text-align:center;color:var(--soft);font-size:.8rem;margin-top:18px;padding-top:14px;border-top:1px solid var(--line)}',
  '@media print{body{background:#fff}.bar{display:none}.q,.score,.contact{break-inside:avoid}a{color:inherit}}',
].join("\n");

const SCRIPT = [
  'document.getElementById("tgl").addEventListener("click", function () {',
  '  var hidden = document.body.classList.toggle("nosrc");',
  '  this.textContent = hidden ? "\\u{1F441}\\uFE0F إظهار مصادر الأسئلة" : "\\u{1F441}\\uFE0F إخفاء مصادر الأسئلة";',
  '});',
  'document.getElementById("tglans").addEventListener("click", function () {',
  '  var hidden = document.body.classList.toggle("noans-hide");',
  '  this.textContent = hidden ? "\\u{1F440} إظهار الأجوبة" : "\\u{1F648} إخفاء الأجوبة";',
  '});',
].join("\n");

// بلا وسم viewport يعرض الهاتف الصفحة بعرض سطح المكتب مصغّراً — والموقع موبايل أولاً
const html =
  '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '<title>ورقة الامتحان المتوقّعة — ' + TARGET + '</title>\n' +
  '<style>\n' + CSS + '\n</style>\n\n' +
  '<div class="wrap">\n' +
  '<header>\n' +
  '  <h1>📄 ورقة الامتحان المتوقّعة</h1>\n' +
  '  <div class="rd">' + TARGET + ' — السادس العلمي · ' + CONTACT.name + '</div>\n' +
  '  <div class="instr">ملاحظة: الإجابة عن خمسة أسئلة فقط، ولكل سؤال (20) درجة.  الزمن: ثلاث ساعات.</div>\n' +
  '</header>\n\n' +
  '<div class="bar">\n' +
  '  <button class="btn" onclick="window.print()">🖨️ حفظ PDF / طباعة</button>\n' +
  (TEACHER
    ? '  <button class="btn ghost" id="tgl">👁️ إخفاء مصادر الأسئلة</button>\n' +
      '  <button class="btn ghost" id="tglans">🙈 إخفاء الأجوبة</button>\n'
    : '') +
  '</div>\n\n' +
  '<div class="note">\n' +
  '  <b>📖 كيف تستفيد منها:</b> كل سؤال هنا <b>جاء فعلاً في امتحان وزاري سابق</b>. تحته <b>📌 انتبه</b>: ما الذي سيتغيّر فيه، و<b>🔁 البدائل</b>: ما قد يأتي بدلَه مرتّباً من الأرجح. ' +
  'بعد الورقة: <b>خريطة المنهج</b> و<b>بنك المصطلحات</b> — لأن كل امتحان فيه مواضيع لم تُسأل من قبل. <b>تدرّب على الطريقة لا على الرقم.</b><br>' +
  '⚠️ هذه <b>توقعات دراسية — ليست أسئلة مسرّبة ولا مضمونة</b>.' +
  (PAPER.note ? '<br>🗓️ ' + esc(PAPER.note) : '') + '\n' +
  '</div>\n\n' +
  renderScore() + '\n\n' +
  body + '\n\n' +
  renderMissed() + '\n\n' +
  renderMap() + '\n\n' +
  renderTerms() + '\n\n' +
  '<div class="consts"><b>ثوابت تُعطى عادةً بالورقة:</b><br>ثابت بلانك h = 6.63×10⁻³⁴ J·s  ·  سرعة الضوء C = 3×10⁸ m/s  ·  كتلة الإلكترون mₑ = 9.11×10⁻³¹ Kg  ·  شحنة الإلكترون e = 1.6×10⁻¹⁹ C</div>\n\n' +
  '<div class="contact">\n' +
  '  <div class="cname">' + CONTACT.name + '</div>\n' +
  '  <div class="crow"><span>📞 ' + CONTACT.phone + '</span><span>✉️ ' + CONTACT.email + '</span></div>\n' +
  '  <div class="csite">🌐 ' + CONTACT.site + '</div>\n' +
  '</div>\n\n' +
  '<footer>ورقة متوقّعة مبنية على أسئلة وزارية حقيقية (2013–2026) · تُحدَّث وتُقيَّم علناً بعد كل دور امتحاني</footer>\n' +
  '</div>\n' +
  (TEACHER ? '<script>\n' + SCRIPT + '\n</script>\n' : '') +
  // القفل لنسخة الطالب فقط — نسخة المعلّم تُولَّد خارج الموقع ولا تُرفع أصلاً
  (TEACHER ? '' : '<script src="../js/access-control.js"></script>\n');

fs.writeFileSync(OUT, html, "utf8");
const allIds = PAPER.questions.flatMap((q) => q.parts.flatMap((p) => p.ids || [p.id]));
const nAlt = PAPER.questions.reduce((a, q) => a + q.parts.reduce((b, p) => b + (p.alternatives || []).length, 0), 0);
const nTerms = TERM_ROWS.reduce((a, r) => a + r.terms.length, 0);
console.log("✅ الورقة المتوقّعة (" + TARGET + ") وُلِّدت → " + OUT + (TEACHER ? "  [نسخة المعلّم]" : ""));
console.log("   " + PAPER.questions.length + " أسئلة · " + allIds.length + " فرعاً · " + nAlt + " بديلاً مرتّباً · " +
  allIds.filter((i) => ANS[i]).length + " فرعاً له جواب نموذجي رسمي");
console.log("   خريطة المنهج: " + LESSONS.length + " درساً · بنك المصطلحات: " + nTerms + " مصطلحاً" +
  (SCORED ? " · نتيجة " + SCORED.label + ": " + SCORED.summary.marks_pct + "% بالدرجات" : ""));
if (termWarnings.length) console.log("⚠️ مصطلحات لم توجد في دروس فصلها (" + termWarnings.length + "):\n   " + termWarnings.join("\n   "));
