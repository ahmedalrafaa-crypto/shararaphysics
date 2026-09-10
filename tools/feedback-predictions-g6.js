#!/usr/bin/env node
/**
 * التغذية الراجعة للتوقعات الوزارية — السادس العلمي.
 *
 * يقارن كل ورقة متوقَّعة صدرت ورقتها الحقيقية، فرعاً فرعاً، ويسجّل النتيجة
 * بدل أن تبقى المقارنة يدوية وانطباعية. الناتج يُغذّي الورقة القادمة:
 *  - سجلّ كل «قاعدة توقّع» (كم مرة أصابت من كم) ← نثق بالقاعدة التي تصيب ونخفّض التي تخطئ.
 *  - تاريخ كل مفهوم عبر الأوراق ← ما استُهلك للتو، وما غاب طويلاً، وما لم يُسأل قط.
 *
 * بعد كل دور امتحاني:
 *   1) انقل الورقة الحقيقية حرفياً إلى دفعة جديدة في data/ وأضفها إلى
 *      tools/merge-wazariyat-g6.js ثم شغّله.
 *   2) أضف وسوم أسئلتها في data/concept-tags-g6.json (المفهوم، وشكل المسألة).
 *   3) شغّل هذا السكربت ← data/predictions-ledger-g6.json
 *   4) ابنِ الورقة القادمة في data/expected-papers-g6.json ثم:
 *      node tools/build-expected-paper-g6.js
 *
 * تعريف النتائج (لكل فرع متوقَّع):
 *   أصاب       — جاء المفهوم نفسه وبالنوع نفسه (مسألة / نشاط / نظري).
 *   أصاب ببديل — لم يأتِ الفرع نفسه، بل أحد البدائل المكتوبة تحته صراحةً.
 *   جزئي       — جاء المفهوم نفسه لكن بنوع آخر (نظري بدل مسألة مثلاً).
 *   أخطأ       — لم يأتِ المفهوم إطلاقاً.
 * للمسائل يُقاس «الشكل» أيضاً (توالٍ/توازٍ/رنين...) إن سمّى التوقع شكلاً.
 *
 * الاستعمال: node tools/feedback-predictions-g6.js
 */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"));

const BANK = readJSON("wazariyat-sadis-ilmi.json").questions;
const T = readJSON("concept-tags-g6.json");
const P = readJSON("expected-papers-g6.json");
const BY_ID = Object.fromEntries(BANK.map((q) => [q.id, q]));

const ROUND_AR = { 0: "التمهيدي", 1: "الدور الأول", 2: "الدور الثاني", 3: "الدور الثالث" };
const roundKey = (y, r) => y + "-r" + r;
const roundLabel = (y, r) => ROUND_AR[r] + " " + y;

// ── نوع السؤال ومجموعته ───────────────────────────────────────────────
function kindOf(q) {
  if (T.kind_override[q.id]) return T.kind_override[q.id];
  const t = String(q.question_text || "");
  if (q.question_type === "مسألة_حسابية") return "problem";
  if (/نشاط|^أ?إ?شرح مع الرسم/.test(t)) return "activity";
  if (/ضع كلمة \(صح\)/.test(t)) return "tf";
  if (q.question_type === "اختيار_من_متعدد") return "mcq";
  if (/المقصود/.test(t)) return "define";
  if (/^علل|^علّل/.test(t)) return "reason";
  if (/أثبت|إثبت|رياضياً|رياضيا|برهن/.test(t)) return "proof";
  if (/^علام|^علامَ|تعتمد/.test(t)) return "depends";
  if (/ميّز|ميز بين|قارن|ما الفرق/.test(t)) return "compare";
  return "explain";
}
const groupOf = (k) => (k === "problem" || k === "activity" ? k : "theory");
const isMeta = (q) => /^ثوابت/.test(String(q.question_number || ""));

// «ما المقصود» بثلاثة مصطلحات = ثلاثة فروع مستقلة؛ أي سؤال آخر = فرع واحد
function unitsOf(q) {
  const concepts = T.tags[q.id] || [];
  const kind = kindOf(q);
  const base = { id: q.id, kind, group: groupOf(kind), variant: T.variants[q.id] || null };
  if (kind === "define" && concepts.length > 1) return concepts.map((c) => Object.assign({}, base, { concepts: [c] }));
  return [Object.assign({}, base, { concepts })];
}

// ── الأوراق الحقيقية المتوفّرة ──────────────────────────────────────────
const papers = new Map();
BANK.filter((q) => !isMeta(q)).forEach((q) => {
  const k = roundKey(q.year, q.round);
  if (!papers.has(k)) papers.set(k, { key: k, year: q.year, round: q.round, label: roundLabel(q.year, q.round), qs: [] });
  papers.get(k).qs.push(q);
});
const ORDER = [...papers.values()].sort((a, b) => a.year - b.year || a.round - b.round);
ORDER.forEach((p, i) => { p.index = i; });

// فحص الوسوم: كل سؤال له مفهوم، وكل مفهوم معرَّف
const untagged = BANK.filter((q) => !isMeta(q) && !(T.tags[q.id] || []).length).map((q) => q.id);
const unknown = [];
Object.entries(T.tags).forEach(([id, cs]) => cs.forEach((c) => { if (!T.concepts[c]) unknown.push(id + " → " + c); }));
if (unknown.length) { console.error("❌ مفاهيم غير معرّفة:\n  " + unknown.join("\n  ")); process.exit(1); }

// ── تاريخ كل مفهوم ───────────────────────────────────────────────────
const history = {};
ORDER.forEach((p) => {
  const seen = new Set();
  p.qs.forEach((q) => unitsOf(q).forEach((u) => u.concepts.forEach((c) => {
    const h = history[c] || (history[c] = { rounds: [], kinds: [] });
    if (!seen.has(c)) { h.rounds.push(p.key); seen.add(c); }
    if (!h.kinds.includes(u.kind)) h.kinds.push(u.kind);
  })));
});

// ── تقييم ورقة متوقَّعة واحدة ───────────────────────────────────────────
function predictedUnits(paper) {
  const out = [];
  paper.questions.forEach((Q) => Q.parts.forEach((part) => {
    const ids = part.ids || (part.id ? [part.id] : []);
    ids.forEach((id) => {
      const q = BY_ID[id];
      if (!q) throw new Error("معرّف غير موجود في البنك: " + id);
      unitsOf(q).forEach((u) => out.push(Object.assign(u, {
        q: Q.n, part: part.label, marks: part.marks || 0, rule: part.rule || null,
        predicted_variants: part.variants || null, alternatives: part.alternatives || [],
      })));
    });
  }));
  return out;
}

const overlaps = (a, b) => a.some((c) => b.includes(c));
const variantMatch = (actual, predicted) => !!actual && predicted.some((v) => actual.startsWith(v));
// شكل المسألة الحقيقية مقابل التوقع: جاء بالتغيير المتوقَّع / جاء كالسؤال الأصلي نفسه / شكل ثالث
function variantOutcome(actual, predicted, base) {
  if (variantMatch(actual, predicted)) return "changed";
  if (actual && base && actual === base) return "same";
  return "other";
}

function score(paper, actualPaper) {
  const pred = predictedUnits(paper);
  const actual = actualPaper.qs.flatMap(unitsOf);

  const items = pred.map((u) => {
    const same = actual.filter((a) => overlaps(a.concepts, u.concepts));
    const exact = same.find((a) => a.group === u.group);
    let outcome = "miss", via = null, variant = null;
    if (exact) {
      outcome = "hit"; via = exact.id;
      if (u.predicted_variants && u.group === "problem") {
        variant = variantOutcome(exact.variant, u.predicted_variants, u.variant);
      }
    } else {
      const alt = u.alternatives.find((al) => actual.some((a) =>
        overlaps(a.concepts, al.concepts) && a.group === (al.group || u.group)));
      if (alt) {
        outcome = "alt"; via = alt.label;
      } else if (same.length) {
        outcome = "partial"; via = same[0].id;
      }
    }
    return {
      q: u.q, part: u.part, marks: u.marks, id: u.id, concepts: u.concepts, group: u.group, rule: u.rule,
      label: T.concepts[u.concepts[0]][1], outcome, via, variant,
    };
  });

  // التغطية: كم من فروع الورقة الحقيقية كان موجوداً في ورقتنا أو في بدائلها؟
  const earlier = ORDER.filter((p) => p.index < actualPaper.index);
  const seenBefore = new Set();
  earlier.forEach((p) => p.qs.forEach((q) => (T.tags[q.id] || []).forEach((c) => seenBefore.add(c))));
  const mainC = pred.flatMap((u) => u.concepts);
  const altC = pred.flatMap((u) => u.alternatives.flatMap((al) => al.concepts));
  const coverage = actual.map((a) => ({
    id: a.id, concepts: a.concepts, group: a.group, label: T.concepts[a.concepts[0]][1],
    covered: overlaps(a.concepts, mainC) ? "main" : overlaps(a.concepts, altC) ? "alt" : "none",
    novel: !a.concepts.some((c) => seenBefore.has(c)),
  }));

  const n = (o) => items.filter((i) => i.outcome === o).length;
  // الفروع الكبرى: مسألة أو نشاط بعشر درجات — هي نصف درجة الورقة
  const big = items.filter((i) => i.marks >= 10 && i.group !== "theory");
  const pct = (a, b) => (b ? Math.round((100 * a) / b) : 0);
  // وزن كل فرع بدرجته: درجة الجزء تُقسَّم على فروعه (اختر اثنين من ثلاثة ← ثلث لكلٍّ منها)
  const partSize = {};
  items.forEach((i) => { const k = i.q + "|" + i.part; partSize[k] = (partSize[k] || 0) + 1; });
  const w = (i) => i.marks / partSize[i.q + "|" + i.part];
  const wSum = (f) => items.filter(f).reduce((a, i) => a + w(i), 0);
  const wAll = wSum(() => true);
  const summary = {
    total: items.length, hit: n("hit"), alt: n("alt"), partial: n("partial"), miss: n("miss"),
    strict_pct: pct(n("hit") + n("alt"), items.length),
    loose_pct: pct(n("hit") + n("alt") + n("partial"), items.length),
    marks_pct: pct(wSum((i) => i.outcome === "hit" || i.outcome === "alt"), wAll),
    marks_loose_pct: pct(wSum((i) => i.outcome !== "miss"), wAll),
    big_total: big.length, big_hit: big.filter((i) => i.outcome === "hit" || i.outcome === "alt").length,
    variant_checked: items.filter((i) => i.variant).length,
    variant_changed: items.filter((i) => i.variant === "changed").length,
    variant_same: items.filter((i) => i.variant === "same").length,
  };
  const cov = {
    total: coverage.length,
    main: coverage.filter((c) => c.covered === "main").length,
    alt: coverage.filter((c) => c.covered === "alt").length,
    none: coverage.filter((c) => c.covered === "none").length,
    novel: coverage.filter((c) => c.novel).length,
    novel_pct: pct(coverage.filter((c) => c.novel).length, coverage.length),
  };
  return { items, coverage, summary, cov };
}

// ── التشغيل ───────────────────────────────────────────────────────────
const scored = [];
P.papers.forEach((paper) => {
  const k = roundKey(paper.target.year, paper.target.round);
  const actual = papers.get(k);
  if (!actual) return;
  const r = score(paper, actual);
  scored.push(Object.assign({ target: paper.target, key: k, label: actual.label, built: paper.built || null }, r));
});

// سجلّ القواعد عبر كل الأدوار المقيَّمة
const rules = {};
Object.entries(P.rules).forEach(([k, name]) => { rules[k] = { name, hits: 0, total: 0 }; });
scored.forEach((s) => s.items.forEach((i) => {
  if (!i.rule || !rules[i.rule]) return;
  rules[i.rule].total++;
  if (i.outcome === "hit" || i.outcome === "alt") rules[i.rule].hits++;
}));

// الدور المستهدف القادم ومدخلاته
const last = ORDER[ORDER.length - 1];
const recent = ORDER.slice(-3).map((p) => p.key);
const concepts = {};
Object.entries(T.concepts).forEach(([k, [lesson, name]]) => {
  const h = history[k] || { rounds: [], kinds: [] };
  concepts[k] = {
    name, lesson, rounds: h.rounds, kinds: h.kinds,
    last: h.rounds[h.rounds.length - 1] || null,
    status: !h.rounds.length ? "never"
      : h.rounds.includes(last.key) ? "just-used"
      : h.rounds.some((r) => recent.includes(r)) ? "recent" : "due",
  };
});

const ledger = {
  generated: new Date().toISOString().slice(0, 10),
  note: "مولَّد آلياً بـ tools/feedback-predictions-g6.js — لا يُعدَّل يدوياً.",
  papers_in_bank: ORDER.map((p) => ({ key: p.key, label: p.label, questions: p.qs.length })),
  last_round: { key: last.key, label: last.label, year: last.year, round: last.round },
  untagged,
  scored,
  rules,
  concepts,
};
fs.writeFileSync(path.join(ROOT, "data", "predictions-ledger-g6.json"), JSON.stringify(ledger, null, 1), "utf8");

// ── التقرير ──────────────────────────────────────────────────────────
const OUT = { hit: "✅ أصاب", alt: "✅ ببديل", partial: "🟡 جزئي", miss: "❌ أخطأ" };
console.log("📚 الأوراق في البنك: " + ORDER.map((p) => p.label + " (" + p.qs.length + ")").join(" · "));
if (untagged.length) console.log("⚠️ أسئلة بلا وسم (" + untagged.length + "): " + untagged.join(", "));
scored.forEach((s) => {
  console.log("\n══ توقعات " + s.label + " مقابل الورقة الحقيقية ══");
  const VAR = { changed: " [تغيّر الشكل كما توقّعنا]", same: " [جاء بشكل السؤال الأصلي]", other: " [شكل ثالث]" };
  s.items.forEach((i) => console.log("  " + (i.q + "/" + i.part).padEnd(15) + OUT[i.outcome].padEnd(9) +
    (i.variant ? VAR[i.variant] : "") + "  " + i.label + (i.rule ? "  ‹" + i.rule + "›" : "")));
  const m = s.summary;
  console.log("  ─ الفروع: " + m.total + " · أصاب " + m.hit + " · ببديل " + m.alt + " · جزئي " + m.partial + " · أخطأ " + m.miss);
  console.log("  ─ بعدد الفروع: " + m.strict_pct + "% تامّة · " + m.loose_pct + "% مع الجزئي  |  بالدرجات: " + m.marks_pct + "% · " + m.marks_loose_pct + "% مع الجزئي");
  console.log("  ─ الفروع الكبرى: " + m.big_hit + "/" + m.big_total +
    (m.variant_checked ? " · تغيّر الشكل كما توقّعنا: " + m.variant_changed + "/" + m.variant_checked : ""));
  const c = s.cov;
  console.log("  ─ تغطية الورقة الحقيقية (" + c.total + " فرعاً): في ورقتنا " + c.main + " · في البدائل " + c.alt + " · غير مغطّى " + c.none +
    " · منها " + c.novel + " (" + c.novel_pct + "%) مفهوم لم يُسأل في أي ورقة سابقة بالبنك");
  const miss = s.coverage.filter((x) => x.covered === "none");
  if (miss.length) console.log("  ─ ما فاتنا: " + miss.map((x) => x.label + (x.novel ? " 🆕" : "")).join(" · "));
});
console.log("\n══ سجلّ قواعد التوقع ══");
Object.entries(rules).forEach(([k, r]) => console.log("  " + k + "  " + (r.total ? r.hits + "/" + r.total : "—").padEnd(6) + "  " + r.name));
const byStatus = (s) => Object.values(concepts).filter((c) => c.status === s).length;
console.log("\n══ حالة المفاهيم بعد " + last.label + " ══");
console.log("  استُهلك للتو: " + byStatus("just-used") + " · جاء قريباً: " + byStatus("recent") + " · غائب ٣ أوراق فأكثر: " + byStatus("due") + " · لم يُسأل قط: " + byStatus("never"));
console.log("\n✅ السجلّ → data/predictions-ledger-g6.json");
