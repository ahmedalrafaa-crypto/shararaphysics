#!/usr/bin/env node
/**
 * بناء بنك الأسئلة الموحّد للسادس العلمي من كل المصادر المتوفرة بالمشروع.
 *
 * السبب: كان بنك التوقعات (49 سؤالاً) مبنياً على مصدر واحد — ملزمة حلول
 * مسائل — فورث انحيازاً بنسبة 69% للمسائل الحسابية، وبقي النصف النوعي من
 * الامتحان (تعليل/مصطلح/مقارنة) بلا مصدر إطلاقاً. هذا السكربت يدمج المصادر
 * الأربعة ويوحّد التصنيف ويحذف التكرار.
 *
 * الاستعمال:  node tools/build-qbank-g6.js
 * الناتج:     data/qbank-g6.json
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");

const CHAPTERS = {
  1: "المتسعات", 2: "الحث الكهرومغناطيسي والذاتي", 3: "التيار المتناوب",
  4: "الموجات الكهرومغناطيسية", 5: "البصريات الفيزيائية", 6: "الفيزياء الحديثة",
  7: "إلكترونيات الحالة الصلبة", 8: "الأطياف الذرية والليزر", 9: "الفيزياء النووية",
};

/** توحيد مسمّيات الأنواع المتناثرة عبر المصادر إلى تصنيف واحد */
const TYPE_ALIASES = {
  "علل": "تعليل", "علّل": "تعليل", "وزاري — علّل": "تعليل",
  "مفهومي (برهان)": "برهان", "برهان وزاري": "برهان",
  "صح أو خطأ · وزاري": "صح وخطأ", "صح او خطأ": "صح وخطأ",
  "قارن": "مقارنة", "وزاري · قارن": "مقارنة",
  "اختيار وزاري": "اختيار من متعدد", "اختيار وزاري متكرر": "اختيار من متعدد",
  "وزاري (اختيار)": "اختيار من متعدد",
  "سؤال": null, "وزاري": null, "سؤال وزاري": null, "سؤال محلول": null,
  "وزاري متكرر": null, "وزاري متكرر جداً": null, "وزاري متكرر حرفياً": null,
  "وزاري — الأكثر تكراراً": null, "سؤال وزاري متكرر جداً": null,
  "انتبه!": null, "تحقّق!": null,
};

function classify(q, sol) {
  const t = String(q || ""), s = String(sol || "");
  if (/ضع\s*(علامة\s*)?(صح|✓)|صح أو خطأ|صحّح ما تحته/.test(t)) return "صح وخطأ";
  if (/^\s*(علّل|علل)\b|علّل\s*:|لماذا|ما سبب|ما السبب|وضّح سبب|فسّر/.test(t)) return "تعليل";
  if (/قارن|الفرق بين|ميّز بين/.test(t)) return "مقارنة";
  if (/عرّف|ما المقصود|ماذا نعني|ما هو تعريف/.test(t)) return "مصطلح";
  if (/املأ الفراغ|أكمل ما يأتي|الفراغات/.test(t)) return "فراغات";
  if (/اختر|أي مما يأتي|أيٌّ من/.test(t)) return "اختيار من متعدد";
  if (/برهن|أثبت|وضّح رياضياً|اشتقّ|استنتج/.test(t)) return "برهان";
  if (/جد .{0,30}(الذي يجعل|اللازم|المطلوب)|بالعكس/.test(t)) return "مسألة معكوسة";
  if (/جد\b|احسب|ما مقدار|كم مقدار|ما قيمة|أوجد/.test(t)) return "مسألة حسابية";
  const nums = (s.match(/\*\*[^*]*[0-9][^*]*\*\*/g) || []).length;
  const eqs = /[=≈]/.test(s) && /[0-9]/.test(s);
  if (nums >= 1 && eqs) return "مسألة حسابية";
  if (/[0-9].*=/.test(t) && eqs) return "مسألة حسابية";
  return "مفهومي";
}

const norm = (s) => String(s || "").replace(/[\sً-ْ]/g, "").replace(/[.،,:؛!؟"'()\[\]]/g, "").slice(0, 120);

const items = [];
const seen = new Map();
function add(rec) {
  const key = norm(rec.question);
  if (!key || key.length < 8) return;
  if (seen.has(key)) {                       // دمج بدل الإهمال: نحتفظ بأغنى نسخة
    const prev = seen.get(key);
    prev.sources = Array.from(new Set([...(prev.sources || []), ...(rec.sources || [])]));
    if (!prev.year && rec.year) { prev.year = rec.year; prev.round = rec.round; }
    if (rec.ministerial) prev.ministerial = true;
    if ((rec.solution || "").length > (prev.solution || "").length) prev.solution = rec.solution;
    return;
  }
  seen.set(key, rec);
  items.push(rec);
}

// ── المصدر 1: قاعدة الوزاريات المتحقّق منها (سنوات ودورات) ────────────────
const waz = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "wazariat-g6.json"), "utf8"));
waz.items.forEach((q) => add({
  chapter: q.chapter, topic: q.topic, type: q.type,
  question: q.question, solution: q.solution,
  year: q.year, round: q.round, round_name: q.round_name,
  ministerial: true, verified: true, sources: ["حلول-متحقق-منها"],
}));

// ── المصدر 2: أسئلة الدروس (الغنيّة بالنوعي) ─────────────────────────────
for (let c = 1; c <= 9; c++) {
  const f = path.join(ROOT, "js", "lessons-data-g6c" + c + ".js");
  if (!fs.existsSync(f)) continue;
  global.window = {};
  delete require.cache[require.resolve(f)];
  require(f);
  (global.window.PHY_LESSONS || []).forEach((l) => {
    (l.qa || []).forEach((q) => {
      const alias = Object.prototype.hasOwnProperty.call(TYPE_ALIASES, q.type) ? TYPE_ALIASES[q.type] : q.type;
      add({
        chapter: c, topic: (l.lesson_title || "").replace(/^[^:]*:\s*/, "").trim() || null,
        type: alias || classify(q.question, q.answer),
        question: q.question, solution: q.answer,
        year: null, round: null, round_name: null,
        ministerial: q.ministerial === true, verified: true, sources: ["دروس-شرارة"],
      });
    });
  });
}

// ── المصدر 3: الأسئلة الوزارية الغريبة ───────────────────────────────────
global.window = {};
require(path.join(ROOT, "js", "weird-questions-data.js"));
(global.window.PHY_WEIRD.items || []).forEach((q) => add({
  chapter: q.chapter, topic: null, type: TYPE_ALIASES[q.type] || q.type || classify(q.q, q.a),
  question: q.q, solution: q.a, hint: q.hint,
  year: null, round: null, round_name: null,
  ministerial: true, verified: true, sources: ["وزاريات-غريبة"],
}));

// ── المصدر 4: بنك التوقعات الحالي ────────────────────────────────────────
global.window = {};
require(path.join(ROOT, "js", "predictions-data-g6.js"));
(global.window.PHY_PREDICTIONS_G6.items || []).forEach((q) => add({
  chapter: q.chapter, topic: q.topic, type: TYPE_ALIASES[q.type] || q.type || classify(q.text, q.solution),
  question: q.text, solution: q.solution,
  year: null, round: null, round_name: null, year_raw: q.years,
  ministerial: true, verified: true, sources: ["بنك-التوقعات"],
}));

// ── المصدر 5: الأوراق الوزارية المنقولة يدوياً (2024–2026) ───────────────
// هذه أوراق كاملة نُقلت من صور رسمية، وتحمل سنتها ودورها — فهي الإشارة
// الأحدث والأقرب لبنية امتحان اليوم، ولا يغطيها المصدر الخارجي القديم.
["wazariyat-sadis-ilmi.json",
 "wazariyat-sadis-ilmi-batch2-unified.json",
 "wazariyat-sadis-ilmi-batch3-2026r1.json"].forEach((f) => {
  const p = path.join(ROOT, "data", f);
  if (!fs.existsSync(p)) return;
  const B = JSON.parse(fs.readFileSync(p, "utf8"));
  (B.questions || []).forEach((q) => {
    if (!q.question_text) return;          // المتروك null لا يدخل البنك
    add({
      chapter: q.chapter, topic: null,
      type: q.question_type === "مسألة_حسابية" ? "مسألة حسابية"
          : q.question_type === "اختيار_من_متعدد" ? "اختيار من متعدد"
          : classify(q.question_text, q.answer),
      question: q.question_text, solution: q.answer,
      year: q.year, round: String(q.round), round_name: null,
      ministerial: true, verified: false, sources: ["ورقة-وزارية-منقولة"],
    });
  });
});

items.forEach((q, i) => { q.id = "g6q-" + String(i + 1).padStart(4, "0"); });

const out = {
  title: "بنك الأسئلة الموحّد — فيزياء السادس العلمي",
  generated: new Date().toISOString().slice(0, 10),
  chapters: CHAPTERS,
  count: items.length,
  items,
};
fs.writeFileSync(path.join(ROOT, "data", "qbank-g6.json"), JSON.stringify(out, null, 1), "utf8");
console.log("✅ البنك الموحّد: " + items.length + " سؤالاً → data/qbank-g6.json");
