#!/usr/bin/env node
/**
 * حساب إحصاءات التكرار الحقيقية للسادس العلمي من البنك الموحّد.
 * ينتج لوحة الأولويات (شبه مضمون / متناوب / مرشّح للعودة) — وهي الميزة
 * التي كانت موجودة بأداة الثالث متوسط وغائبة تماماً عن السادس.
 *
 * الاستعمال:  node tools/analyze-qbank-g6.js
 * الناتج:     data/stats-g6.json
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "qbank-g6.json"), "utf8"));

const dated = D.items.filter((q) => q.year);
const YEARS = Array.from(new Set(dated.map((q) => q.year))).sort();
const SPAN = YEARS.length;

// وزن كل فصل حسب الأسئلة المؤرّخة (إشارة الامتحان الحقيقية).
// المقام هو الأسئلة المؤرّخة *المصنّفة بفصل* فقط — لأن الأوراق المنقولة
// يدوياً لم تُصنَّف بفصولها بعد، وإدخالها في المقام يُنقص كل النسب زوراً.
const classified = dated.filter((q) => q.chapter != null && D.chapters[q.chapter]);
const chapter_weight = Object.keys(D.chapters).map((n) => {
  const c = classified.filter((q) => String(q.chapter) === n);
  return {
    chapter: +n, name: D.chapters[n], count: c.length,
    pct: +(100 * c.length / classified.length).toFixed(1),
    years: Array.from(new Set(c.map((q) => q.year))).sort().length,
  };
}).sort((a, b) => b.count - a.count);

// توزيع الأنواع — من البنك كاملاً ومن المؤرّخ وحده
const typeDist = (list) => {
  const t = {};
  list.forEach((q) => { t[q.type] = (t[q.type] || 0) + 1; });
  return Object.fromEntries(Object.entries(t).sort((a, b) => b[1] - a[1]));
};

// ---- تنظيف تسميات المواضيع ----
// المصدر ملزمة مبوّبة، فتسرّبت عناوين تنظيمية ("المجموعة الثانية"، "تابع") بدل مواضيع فيزيائية.
// ننقذ ما يحمل موضوعاً حقيقياً، ونستبعد الباقي من لوحة الأولويات مع إحصائه صراحةً.
const ORG_ONLY = /^(غير مصنّف|تابع|تتمة الفصل|المجموعة (الأولى|الثانية|الثالثة|الرابعة|الخامسة|السادسة|السابعة)|حلول وزاريات.*|.*صفحة عنوان.*|ختام.*|.*بداية المجموعة.*|.*وبداية .*)$/;

function cleanTopic(raw) {
  if (!raw) return null;
  let t = String(raw).trim();
  t = t.replace(/^تتمة\s*[:：]?\s*/, "");          // "تتمة: الساق المنزلقة" → "الساق المنزلقة"
  t = t.replace(/\s*[،,]\s*تابع\s*$/, "");         // "الرنين، تابع" → "الرنين"
  const m = t.match(/^المجموعة\s+\S+\s*\(([^)]+)\)/); // "المجموعة الأولى (التوالي)" → "التوالي"
  if (m) t = m[1].trim();
  t = t.replace(/\s+/g, " ").trim();
  if (!t || ORG_ONLY.test(t)) return null;
  // تسميات تصف مسألة بعينها لا موضوعاً منهجياً — تُحسب ضمن "غير مصنّف"
  if (/[=＝]|\d\s*[μµ]?F|^س\d|تكملة|ختام|بداية |^الفصل$/.test(t)) return null;
  return t;
}

// تكرار كل موضوع عبر السنوات — أساس لوحة الأولويات
const byTopic = {};
let unclassified = 0;
dated.forEach((q) => {
  const topic = q.chapter == null ? null : cleanTopic(q.topic);
  if (!topic) { unclassified++; return; }
  const k = q.chapter + "|" + topic;
  (byTopic[k] = byTopic[k] || { chapter: q.chapter, topic: topic, years: new Set(), count: 0, types: new Set() });
  byTopic[k].years.add(q.year);
  byTopic[k].types.add(q.type);
  byTopic[k].count++;
});
const topics = Object.values(byTopic).map((t) => ({
  chapter: t.chapter, topic: t.topic, count: t.count,
  year_count: t.years.size, last: Math.max(...t.years),
  types: Array.from(t.types),
})).sort((a, b) => b.year_count - a.year_count || b.count - a.count);

const NEWEST = Math.max(...YEARS);
const must = topics.filter((t) => t.year_count >= 4);
const rotate = topics.filter((t) => t.year_count >= 2 && t.year_count < 4);
const comeback = topics.filter((t) => t.year_count === 1 && NEWEST - t.last >= 3);

// الفجوات: خلايا (فصل × نوع) ضعيفة أو فارغة
const TYPES = ["مسألة حسابية", "مفهومي", "تعليل", "مصطلح", "مقارنة", "صح وخطأ", "اختيار من متعدد", "فراغات", "برهان", "مسألة معكوسة"];
const gaps = [];
Object.keys(D.chapters).forEach((n) => {
  TYPES.forEach((ty) => {
    const c = D.items.filter((q) => String(q.chapter) === n && q.type === ty).length;
    if (c < 3) gaps.push({ chapter: +n, chapter_name: D.chapters[n], type: ty, count: c });
  });
});

const out = {
  generated: new Date().toISOString().slice(0, 10),
  total_questions: D.count,
  dated_questions: dated.length,
  classified_questions: classified.length,
  years_covered: YEARS, year_span: SPAN,
  chapter_weight,
  type_distribution_all: typeDist(D.items),
  type_distribution_dated: typeDist(dated),
  priority: { must, rotate, comeback },
  unclassified: { count: unclassified, pct: +(100 * unclassified / dated.length).toFixed(1) },
  gaps: gaps.sort((a, b) => a.count - b.count),
};
fs.writeFileSync(path.join(ROOT, "data", "stats-g6.json"), JSON.stringify(out, null, 1), "utf8");
console.log("✅ الإحصاءات → data/stats-g6.json");
console.log("   سنوات مغطاة: " + SPAN + " (" + YEARS[0] + "–" + NEWEST + ")");
console.log("   شبه مضمون: " + must.length + " | متناوب: " + rotate.length + " | مرشّح للعودة: " + comeback.length);
console.log("   فجوات (فصل×نوع فيها أقل من 3 أسئلة): " + gaps.length);
