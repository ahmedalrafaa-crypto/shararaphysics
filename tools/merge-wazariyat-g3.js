/* دمج دفعات نقل الثالث المتوسط في ملف واحد — ترتيب: السنة ← الدور ← رقم السؤال */
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "data");
const OUT = path.join(DIR, "wazariyat-thalith-mutawassit.json");

const batches = fs.readdirSync(DIR)
  .filter((f) => /^wazariyat-thalith-mutawassit-batch\d+\.json$/.test(f))
  .sort();

const seen = new Map();
let dupes = 0;
const caveats = new Set();
batches.forEach((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  if (j.metadata && j.metadata.source_caveat) caveats.add(j.metadata.source_caveat);
  (j.questions || []).forEach((q) => {
    if (seen.has(q.id)) { dupes++; return; }
    seen.set(q.id, q);
  });
  console.log("  ✅ " + f.padEnd(46) + (j.questions || []).length + " سؤال");
});

const qs = [...seen.values()].sort((a, b) =>
  (b.year || 0) - (a.year || 0) ||
  (a.round || 0) - (b.round || 0) ||
  String(a.question_number).localeCompare(String(b.question_number), "ar")
);

const needs = qs.filter((q) => q.needs_review).length;
fs.writeFileSync(OUT, JSON.stringify({
  metadata: {
    subject: "physics", grade: "ثالث_متوسط",
    generated_at: new Date().toISOString().slice(0, 10),
    status: "raw_unverified",
    note: "بيانات خام مستخرجة آلياً من صور أوراق وزارية — غير معتمدة علمياً. ممنوع استخدامها بالمنصة قبل مراجعة أحمد سؤالاً سؤالاً.",
    source_caveats: [...caveats],
    merged_from: batches,
    total_questions: qs.length,
    needs_review_count: needs,
  },
  questions: qs,
}, null, 2), "utf8");

console.log("\n📦 المجموع: " + qs.length + " سؤالاً | needs_review: " + needs + " | مكرّر مُسقَط: " + dupes);
const per = {};
qs.forEach((q) => { const k = q.year + " — الدور " + q.round; per[k] = (per[k] || 0) + 1; });
Object.entries(per).sort().forEach(([k, v]) => console.log("   " + k.padEnd(22) + v));
