#!/usr/bin/env node
/**
 * استخراج قاعدة الأسئلة الوزارية للسادس العلمي من ملفات الحلول المتحقّق منها.
 *
 * المصدر (خارج المستودع): مجلد PHY6 الذي يحوي ملفات "الحلول_المتحقق_منها_*.md"
 * الناتج: data/wazariat-g6.json  — قاعدة منظّمة بالسنة والدور والفصل والنوع.
 *
 * الاستعمال:
 *   node tools/extract-wazariat-g6.js "C:/Users/USER/Desktop/New folder/PHY6"
 *
 * سبب وجود هذا الملف: أداة التوقعات السابقة بُنيت مرة واحدة يدوياً بلا مصدر
 * قابل لإعادة التوليد، فتعذّر تحديثها أو تدقيقها. هذا السكربت يزيل ذلك.
 */
const fs = require("fs");
const path = require("path");

const CHAPTERS = {
  1: "المتسعات",
  2: "الحث الكهرومغناطيسي والذاتي",
  3: "التيار المتناوب",
  4: "الموجات الكهرومغناطيسية",
  5: "البصريات الفيزيائية",
  6: "الفيزياء الحديثة",
  7: "إلكترونيات الحالة الصلبة",
  8: "الأطياف الذرية والليزر",
  9: "الفيزياء النووية",
};

// اسم الملف ← رقم الفصل (الفصل الأول محفوظ باسم قديم "الملف1")
const FILE_TO_CHAPTER = {
  الملف1: 1, الفصل2: 2, الفصل3: 3, الفصل4: 4, الفصل5: 5,
  الفصل6: 6, الفصل7: 7, الفصل8: 8, الفصل9: 9,
};

const ROUND_NAMES = {
  "1": "الدور الأول", "2": "الدور الثاني", "3": "الدور الثالث",
  "ت": "تمهيدي", "ن": "نازحين", "خ.ق": "خارج القطر", "تطبيقي": "تطبيقي",
};

/** يفكّ وسماً مثل "1/2019" أو "ت/2020" أو "2018/ت" أو "ن2/2014" إلى {round, year} */
function parseTag(tag) {
  const out = [];
  String(tag || "").split(/[،,]/).forEach((raw) => {
    const t = raw.trim();
    if (!t) return;
    const year = (t.match(/\b(20\d{2})\b/) || [])[1] || null;
    let round = null;
    const before = t.split(/20\d{2}/)[0] || "";
    const after = t.split(/20\d{2}/)[1] || "";
    const rm = (before + after).match(/(خ\.ق|تطبيقي|[123تن])/);
    if (rm) round = rm[1];
    out.push({ year: year ? +year : null, round, round_name: ROUND_NAMES[round] || null, raw: t });
  });
  return out.length ? out : [{ year: null, round: null, round_name: null, raw: "" }];
}

/** تصنيف نوع السؤال من نصّه وحلّه معاً — التصنيف الذي افتقده البنك القديم */
function classify(q, sol) {
  const t = String(q || "");
  const s = String(sol || "");
  // الأنواع النوعية تُحسم من نص السؤال أولاً
  if (/ضع\s*(علامة\s*)?(صح|✓)|صح أو خطأ|صحّح ما تحته/.test(t)) return "صح وخطأ";
  if (/^\s*(علّل|علل)|علّل\s*:|لماذا|ما سبب|ما السبب|وضّح سبب|فسّر/.test(t)) return "تعليل";
  if (/قارن|الفرق بين|ميّز بين/.test(t)) return "مقارنة";
  if (/عرّف|ما المقصود|ماذا نعني|ما هو تعريف/.test(t)) return "مصطلح";
  if (/املأ الفراغ|أكمل ما يأتي|الفراغات/.test(t)) return "فراغات";
  if (/اختر|أي مما يأتي|أيٌّ من/.test(t)) return "اختيار من متعدد";
  if (/برهن|أثبت|وضّح رياضياً|اشتقّ|استنتج/.test(t)) return "برهان";
  // مسألة معكوسة: يُعطى الناتج ويُطلب المعطى الأصلي
  if (/جد .{0,30}(الذي يجعل|اللازم|المطلوب)|ما .{0,20}الأصلي|بالعكس/.test(t)) return "مسألة معكوسة";
  // صيغة حسابية صريحة
  if (/جد|احسب|ما مقدار|كم مقدار|ما قيمة|أوجد/.test(t)) return "مسألة حسابية";
  // وإلا: نستدلّ من الحل — وجود نتائج رقمية مُبرَزة يعني مسألة حسابية
  const numericResults = (s.match(/\*\*[^*]*[0-9][^*]*\*\*/g) || []).length;
  const hasEquations = /[=≈]/.test(s) && /[0-9]/.test(s);
  if (numericResults >= 1 && hasEquations) return "مسألة حسابية";
  // معطيات رقمية بالسؤال بلا مطلوب صريح ← مسألة أيضاً
  if (/[0-9].*[=]/.test(t) && hasEquations) return "مسألة حسابية";
  return "مفهومي";
}

/** استخراج موضوع مختصر من عنوان القسم (## ص PDF ... — الموضوع) */
function topicFromHeading(h) {
  if (!h) return null;
  const m = h.match(/—\s*(.+?)\s*$/);
  return m ? m[1].replace(/\s*\([^)]*\)\s*$/, "").trim() : null;
}

function extract(dir) {
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith("الحلول_المتحقق_منها_") && f.endsWith(".md"));
  const items = [];
  let seq = 0;

  files.forEach((file) => {
    const key = Object.keys(FILE_TO_CHAPTER).find((k) => file.includes(k));
    if (!key) return; // يتجاهل ملف "وزاريات_غريبة" (له تبويبه المستقل)
    const chapter = FILE_TO_CHAPTER[key];
    const txt = fs.readFileSync(path.join(dir, file), "utf8");

    // خريطة العناوين لاستنتاج الموضوع لكل سؤال حسب موقعه
    const heads = [];
    const hre = /^#{2,3} (.+)$/gm;
    let hm;
    while ((hm = hre.exec(txt))) heads.push({ i: hm.index, text: hm[1] });
    const topicAt = (pos) => {
      let cur = null;
      for (const h of heads) { if (h.i < pos) cur = h.text; else break; }
      return topicFromHeading(cur);
    };

    const push = (tag, question, solution, pos) => {
      const qt = question.replace(/^\s*[:：]\s*/, "").trim();
      if (!qt) return;
      parseTag(tag).forEach((y) => {
        items.push({
          id: "g6-" + String(++seq).padStart(4, "0"),
          chapter,
          chapter_name: CHAPTERS[chapter],
          topic: topicAt(pos),
          type: classify(qt, solution),
          year: y.year,
          round: y.round,
          round_name: y.round_name,
          year_raw: y.raw,
          question: qt,
          solution: solution.trim(),
          source: "حلول حسين محمد (140 صفحة) — مراجعة مصوّرة متحقَّق منها",
          verified: true,
        });
      });
    };

    // الصيغة الأساسية:  **سN (وسم):** نص  ثم أسطر الحل
    const re = /\*\*س(\d*)\s*(?:\(([^)]*)\))?\s*:?\*\*/g;
    const marks = [];
    let m;
    while ((m = re.exec(txt))) marks.push({ tag: (m[2] || "").trim(), i: m.index, end: re.lastIndex });
    marks.forEach((mk, k) => {
      const seg = txt.slice(mk.end, k + 1 < marks.length ? marks[k + 1].i : txt.length);
      const stop = seg.search(/\n(---|## |\*\*تحقّق)/);
      const block = (stop >= 0 ? seg.slice(0, stop) : seg).trim();
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      push(mk.tag, lines[0] || "", lines.slice(1).join(" "), mk.i);
    });

    // الصيغة المختصرة بالنقاط:  - **وصف (سنة):** حل   (الفصل السادس يستعملها لـ20 مسألة)
    const bre = /^- \*\*(.+?)\*\*\s*(.*)$/gm;
    let bm;
    while ((bm = bre.exec(txt))) {
      const head = bm[1];
      const tagM = head.match(/\(([^)]*\d{4}[^)]*)\)/);
      if (!tagM) continue;
      push(tagM[1], head.replace(/\s*\([^)]*\)\s*:?\s*$/, ""), bm[2] || "", bm.index);
    }
  });

  return items;
}

const dir = process.argv[2];
if (!dir || !fs.existsSync(dir)) {
  console.error("الاستعمال: node tools/extract-wazariat-g6.js <مسار مجلد PHY6>");
  process.exit(1);
}

const items = extract(dir);
const out = {
  title: "قاعدة الأسئلة الوزارية — فيزياء السادس العلمي",
  generated: new Date().toISOString().slice(0, 10),
  source_note: "مستخرجة آلياً من ملفات الحلول المتحقّق منها يدوياً (مراجعة صور PDF، صفر أخطاء حسابية).",
  chapters: CHAPTERS,
  count: items.length,
  items,
};
const dest = path.join(__dirname, "..", "data", "wazariat-g6.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 1), "utf8");
console.log("✅ استُخرج " + items.length + " سؤالاً → data/wazariat-g6.json");
