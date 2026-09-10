/* دمج دفعات النقل في الملف النهائي — ترتيب: المسار ← السنة ← الدور ← رقم السؤال */
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "..", "data");
const OUT = path.join(DIR, "wazariyat-sadis-ilmi.json");

const BATCHES = [
  "wazariyat-sadis-ilmi.json",
  "wazariyat-sadis-ilmi-batch2-unified.json",
  "wazariyat-sadis-ilmi-batch3-2026r1.json",
  "wazariyat-sadis-ilmi-batch4-2026r2.json",
];

const seen = new Map();
const dupes = [];
BATCHES.forEach((f) => {
  const p = path.join(DIR, f);
  if (!fs.existsSync(p)) return console.log("  ⚠️ مفقود: " + f);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  (j.questions || []).forEach((q) => {
    if (seen.has(q.id)) { dupes.push(q.id); return; }
    seen.set(q.id, q);
  });
  console.log("  ✅ " + f.padEnd(46) + (j.questions || []).length + " سؤال");
});

const TRACK_ORDER = { "موحد": 0, "مشترك": 1, "احيائي": 2, "تطبيقي": 3 };
const qs = [...seen.values()].sort((a, b) =>
  (TRACK_ORDER[a.track] ?? 9) - (TRACK_ORDER[b.track] ?? 9) ||
  (b.year || 0) - (a.year || 0) ||
  (a.round || 0) - (b.round || 0) ||
  String(a.question_number).localeCompare(String(b.question_number), "ar")
);

const needs = qs.filter((q) => q.needs_review).length;
const out = {
  metadata: {
    subject: "physics", grade: "سادس_علمي",
    generated_at: new Date().toISOString().slice(0, 10),
    status: "raw_unverified",
    note: "بيانات خام مستخرجة آلياً من مصادر خارجية — غير معتمدة علمياً. ممنوع استخدامها بالمنصة قبل مراجعة أحمد سؤالاً سؤالاً.",
    merged_from: BATCHES,
    total_questions: qs.length,
    needs_review_count: needs,
  },
  questions: qs,
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
console.log("\n📦 المجموع بعد الدمج: " + qs.length + " سؤالاً | needs_review: " + needs + " | مكرّر مُسقَط: " + dupes.length);
const per = {};
qs.forEach((q) => { const k = q.year + " — الدور " + q.round + " (" + q.track + ")"; per[k] = (per[k] || 0) + 1; });
Object.entries(per).sort().forEach(([k, v]) => console.log("   " + k.padEnd(34) + v));
