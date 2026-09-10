#!/usr/bin/env node
/**
 * توليد صفحة مراجعة بشرية لبنك أسئلة منقول (raw_unverified).
 *
 * الغرض: يقارن أحمد كل سؤال منقول بصورة الورقة الأصلية، ويؤشّر
 * ما هو سليم وما يحتاج تصحيحاً. التأشير يُحفظ على الجهاز (localStorage)
 * ويمكن تصديره JSON لإعادة إدخاله على الملف.
 *
 * الاستعمال: node tools/build-review-sheet.js <bank.json> [out.html]
 */
const fs = require("fs");
const path = require("path");

const src = process.argv[2];
if (!src) { console.error("مرّر مسار ملف البنك"); process.exit(1); }
const D = JSON.parse(fs.readFileSync(src, "utf8"));
const out = process.argv[3] || path.join(path.dirname(src), "..", "review-sheet.html");

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const ROUND_AR = { 0: "التمهيدي", 1: "الدور الأول", 2: "الدور الثاني", 3: "الدور الثالث" };

// نجمّع الأسئلة حسب الورقة (سنة + دور) لعرض صورة كل ورقة مرة واحدة
const papers = new Map();
D.questions.forEach((q) => {
  const k = q.year + "|" + q.round;
  if (!papers.has(k)) papers.set(k, { year: q.year, round: q.round, img: q.source_url, items: [] });
  papers.get(k).items.push(q);
});

const body = [...papers.values()].map((p) => {
  const rows = p.items.map((q, i) => {
    const flag = q.needs_review
      ? '<span class="badge warn">يحتاج مراجعة</span>'
      : '<span class="badge ok">ثقة عالية</span>';
    const opts = q.options
      ? '<div class="opts">( ' + q.options.map(esc).join(" &nbsp;·&nbsp; ") + ' )</div>'
      : "";
    const note = q.notes ? '<div class="note">📝 ' + esc(q.notes) + "</div>" : "";
    return '<article class="q" data-id="' + esc(q.id) + '">' +
      '<div class="qhead"><span class="qnum">' + esc(q.question_number) + "</span>" +
      '<span class="qtype">' + esc(q.question_type) + "</span>" +
      '<span class="qmarks">' + (q.marks || "—") + " درجة</span>" + flag + "</div>" +
      '<p class="qtext">' + esc(q.question_text) + "</p>" + opts + note +
      '<div class="verdict">' +
      '<button class="v good" data-v="ok">✅ منقول صحيح</button>' +
      '<button class="v bad" data-v="fix">✏️ فيه خطأ</button>' +
      '<textarea class="fixbox" placeholder="اكتب النص الصحيح أو ملاحظتك…" hidden></textarea>' +
      "</div></article>";
  }).join("");

  return '<section class="paper">' +
    '<h2>' + p.year + " — " + (ROUND_AR[p.round] || "؟") + " <span class=\"cnt\">" + p.items.length + " سؤال</span></h2>" +
    '<details class="imgwrap"><summary>📄 اعرض صورة الورقة الأصلية</summary>' +
    '<img src="' + esc(p.img) + '" alt="صورة الورقة" loading="lazy"></details>' +
    rows + "</section>";
}).join("");

const CSS = `
:root{--ink:#111a33;--soft:#616c92;--line:#e4e8f5;--bg:#f4f6fc;--card:#fff;--blue:#2b3f8f;--green:#0f9d58;--amber:#e8a317;--red:#d64550}
*{box-sizing:border-box}
body{margin:0;font-family:Cairo,"Segoe UI",Tahoma,sans-serif;background:var(--bg);color:var(--ink);direction:rtl;line-height:1.85}
.wrap{max-width:900px;margin:0 auto;padding:18px 14px 40px}
header{background:linear-gradient(135deg,#22347a,#6b3fa8);color:#fff;border-radius:18px;padding:24px;margin-bottom:16px}
header h1{margin:0 0 6px;font-size:1.35rem;font-weight:900}
header p{margin:0;opacity:.93;font-size:.9rem}
.bar{display:flex;gap:9px;flex-wrap:wrap;margin:14px 0;position:sticky;top:0;background:var(--bg);padding:10px 0;z-index:5;border-bottom:1px solid var(--line)}
.btn{border:0;border-radius:10px;padding:10px 18px;font-family:inherit;font-size:.88rem;font-weight:800;cursor:pointer;background:var(--blue);color:#fff}
.btn.ghost{background:var(--card);color:var(--blue);border:1px solid var(--line)}
.progress{margin-inline-start:auto;font-size:.85rem;font-weight:800;color:var(--soft);align-self:center}
.paper{margin-bottom:26px}
.paper h2{font-size:1.05rem;font-weight:800;display:flex;align-items:center;gap:8px;border-bottom:2px solid var(--line);padding-bottom:8px}
.cnt{margin-inline-start:auto;font-size:.72rem;font-weight:700;color:var(--soft);background:rgba(97,108,146,.13);border-radius:999px;padding:3px 10px}
.imgwrap{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin-bottom:14px}
.imgwrap summary{cursor:pointer;font-weight:800;font-size:.88rem;color:var(--blue)}
.imgwrap img{width:100%;margin-top:10px;border-radius:8px;border:1px solid var(--line)}
.q{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;margin-bottom:10px}
.q.done-ok{border-inline-start:5px solid var(--green)}
.q.done-fix{border-inline-start:5px solid var(--red)}
.qhead{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px}
.qnum{font-weight:900;font-size:.9rem;color:var(--blue)}
.qtype,.qmarks{font-size:.7rem;font-weight:700;color:var(--soft);background:rgba(97,108,146,.13);border-radius:999px;padding:3px 10px}
.badge{font-size:.68rem;font-weight:800;color:#fff;border-radius:999px;padding:3px 10px;margin-inline-start:auto}
.badge.ok{background:var(--green)}
.badge.warn{background:var(--amber)}
.qtext{margin:0;font-weight:600;font-size:.95rem}
.opts{margin-top:7px;font-size:.88rem;color:var(--soft);font-weight:600}
.note{margin-top:8px;background:rgba(232,163,23,.1);border-inline-start:3px solid var(--amber);border-radius:0 8px 8px 0;padding:7px 11px;font-size:.82rem}
.verdict{display:flex;gap:8px;flex-wrap:wrap;margin-top:11px}
.v{border:1px solid var(--line);background:var(--card);border-radius:9px;padding:7px 14px;font-family:inherit;font-size:.82rem;font-weight:800;cursor:pointer}
.v.good.on{background:var(--green);color:#fff;border-color:var(--green)}
.v.bad.on{background:var(--red);color:#fff;border-color:var(--red)}
.fixbox{width:100%;margin-top:8px;border:1px solid var(--line);border-radius:9px;padding:9px 11px;font-family:inherit;font-size:.86rem;min-height:70px;resize:vertical}
@media (prefers-color-scheme:dark){:root{--ink:#e8ecf8;--soft:#98a3c6;--line:#27304d;--bg:#0d1220;--card:#151c30}}
`;

const SCRIPT = `
var KEY = "review_" + ${JSON.stringify(path.basename(src))};
function load(){ try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e){ return {}; } }
function save(d){ try { localStorage.setItem(KEY, JSON.stringify(d)); } catch(e){} }
function paint(){
  var d = load(), total = document.querySelectorAll(".q").length, done = 0;
  document.querySelectorAll(".q").forEach(function(q){
    var id = q.getAttribute("data-id"), r = d[id];
    q.classList.remove("done-ok","done-fix");
    q.querySelectorAll(".v").forEach(function(b){ b.classList.remove("on"); });
    var box = q.querySelector(".fixbox");
    if (!r) { box.hidden = true; return; }
    done++;
    q.classList.add(r.v === "ok" ? "done-ok" : "done-fix");
    q.querySelector('.v[data-v="' + r.v + '"]').classList.add("on");
    box.hidden = r.v !== "fix";
    if (r.text) box.value = r.text;
  });
  document.getElementById("prog").textContent = "راجعتَ " + done + " من " + total;
}
document.addEventListener("click", function(e){
  var b = e.target.closest(".v"); if (!b) return;
  var q = b.closest(".q"), id = q.getAttribute("data-id"), v = b.getAttribute("data-v");
  var d = load();
  if (d[id] && d[id].v === v) delete d[id];
  else d[id] = { v: v, text: (d[id] && d[id].text) || "" };
  save(d); paint();
});
document.addEventListener("input", function(e){
  if (!e.target.classList.contains("fixbox")) return;
  var q = e.target.closest(".q"), id = q.getAttribute("data-id");
  var d = load(); if (!d[id]) d[id] = { v: "fix", text: "" };
  d[id].text = e.target.value; save(d);
});
document.getElementById("exportBtn").addEventListener("click", function(){
  var d = load();
  var blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "review-" + Date.now() + ".json";
  document.body.appendChild(a); a.click(); a.remove();
});
document.getElementById("resetBtn").addEventListener("click", function(){
  if (confirm("مسح كل التأشيرات؟")) { save({}); paint(); }
});
paint();
`;

const html = "<title>مراجعة بنك الأسئلة — " + esc(D.metadata.grade || "") + "</title>\n" +
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">\n' +
  "<style>" + CSS + "</style>\n" +
  '<div class="wrap">\n<header>\n' +
  "  <h1>🔍 مراجعة بنك الأسئلة المنقولة</h1>\n" +
  "  <p>" + esc(D.metadata.grade || "") + " · " + D.questions.length + " سؤالاً · حالة الملف: <b>" + esc(D.metadata.status) + "</b><br>" +
  "قارن كل سؤال بصورة الورقة الأصلية، وأشّر: منقول صحيح أم فيه خطأ. تأشيرك يُحفظ على جهازك تلقائياً.</p>\n" +
  "</header>\n" +
  '<div class="bar">' +
  '<button class="btn" id="exportBtn">⬇️ صدّر المراجعة JSON</button>' +
  '<button class="btn ghost" id="resetBtn">🗑️ امسح التأشيرات</button>' +
  '<span class="progress" id="prog"></span>' +
  "</div>\n" + body + "\n</div>\n<script>" + SCRIPT + "</script>\n";

fs.writeFileSync(out, html, "utf8");
console.log("✅ صفحة المراجعة → " + out);
console.log("   " + D.questions.length + " سؤالاً في " + papers.size + " ورقة");
