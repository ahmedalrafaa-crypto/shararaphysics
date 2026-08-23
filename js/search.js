/* ============================================================
   محرك البحث الموحّد بالموقع: يفهرس window.PHY_LESSONS
   (مفاهيم/قوانين/ملاحظات/جداول/أمثلة/أسئلة) ويبحث فيها محلياً.
   ============================================================ */
(function () {
  "use strict";
  if (typeof window.PHY_LESSONS === "undefined") return;
  var ALL = window.PHY_LESSONS;

  var ALEF = /[أإآا]/g, TEH = /ة/g, YEH = /ى/g, TATWEEL = /ـ/g;
  // تشكيل عربي فقط (وليس الحروف نفسها): U+0610-061A تعليقات قرآنية، U+064B-065F حركات/تنوين، U+0670 ألف علوية، U+06D6-06ED علامات قرآنية
  var DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;
  function normalize(s) {
    return (s || "")
      .replace(DIACRITICS, "")
      .replace(ALEF, "ا").replace(TEH, "ه").replace(YEH, "ي").replace(TATWEEL, "")
      .toLowerCase().replace(/\s+/g, " ").trim();
  }

  /* ---------- بناء الفهرس المسطّح ---------- */
  // فصول الثالث متوسط chapter_number رقم صرف (0..9) ومجلدها "chN"؛
  // فصول السادس الإعدادي chapter_number نص جاهز فعلاً ("g6c1"..."g6c9") فلا يُسبَق بشيء
  function chFolder(chapterNumber) {
    return (typeof chapterNumber === "string") ? chapterNumber : "ch" + chapterNumber;
  }
  // عنصر "أسئلة نهاية الفصل" الاصطناعي (بعد آخر درس حقيقي) يودي لـquestions.html لا lessonN.html
  function pageOf(l) {
    return l.lesson_title === "أسئلة ومسائل نهاية الفصل" ? "questions.html" : "lesson" + l.lesson_number + ".html";
  }
  var INDEX = [];
  function push(l, type, text, ministerial) {
    text = (text || "").trim();
    if (!text) return;
    INDEX.push({
      ch: l.chapter_number, chTitle: l.chapter_title,
      ls: l.lesson_number, lsTitle: l.lesson_title,
      type: type, text: text, norm: normalize(type + " " + text), normText: normalize(text),
      ministerial: !!ministerial,
      link: "../chapters/" + chFolder(l.chapter_number) + "/" + pageOf(l)
    });
  }
  ALL.forEach(function (l) {
    l.concepts.forEach(function (c) { push(l, "مفهوم", c.term + " — " + c.text, c.ministerial); });
    l.laws.forEach(function (law) { push(l, "قانون", law.name + " " + law.formula + " " + (law.variables_note || ""), false); });
    l.notes.forEach(function (n) { push(l, "ملاحظة", (n.heading ? n.heading + " " : "") + n.items.join(" — "), n.ministerial); });
    l.tables.forEach(function (t) { push(l, "جدول", (t.caption ? t.caption + " — " : "") + t.headers.join(" / "), t.ministerial); });
    l.examples.forEach(function (e) { push(l, "مثال", e.problem, e.ministerial); });
    l.qa.forEach(function (q) { push(l, q.type || "سؤال", q.question + (q.answer ? " — " + q.answer : ""), q.ministerial); });
  });

  /* ---------- البحث ---------- */
  function search(query) {
    var tokens = normalize(query).split(" ").filter(Boolean);
    if (!tokens.length) return [];
    var results = [];
    INDEX.forEach(function (rec) {
      var pos = -1, ok = true;
      for (var i = 0; i < tokens.length; i++) {
        if (rec.norm.indexOf(tokens[i]) === -1) { ok = false; break; }
        // موضع الفقرة المعروضة يُحسب من نص العرض نفسه فقط (بلا بادئة النوع)،
        // فكلمة نوع مثل "قانون" قد تُطابق ولن تظهر بموضعها بالنص المعروض
        var pt = rec.normText.indexOf(tokens[i]);
        if (pt !== -1 && (pos === -1 || pt < pos)) pos = pt;
      }
      if (!ok) return;
      if (pos === -1) pos = 0; // كل التطابقات كانت بكلمة النوع فقط
      var score = pos + rec.text.length / 40 - (rec.ministerial ? 8 : 0);
      results.push({ rec: rec, pos: pos, score: score });
    });
    results.sort(function (a, b) { return a.score - b.score; });
    return results.slice(0, 80);
  }

  function snippet(text, pos) {
    var RADIUS = 55;
    var start = Math.max(0, pos - RADIUS);
    var end = Math.min(text.length, pos + RADIUS);
    var s = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    return s;
  }

  function highlight(text, tokensRaw) {
    var esc = text.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; });
    tokensRaw.forEach(function (t) {
      if (!t) return;
      var re = new RegExp("(" + t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      esc = esc.replace(re, "<mark>$1</mark>");
    });
    return esc;
  }

  var TYPE_CLASS = {
    "مفهوم": "t-concept", "قانون": "t-law", "ملاحظة": "t-note", "جدول": "t-table",
    "مثال": "t-example", "سؤال": "t-q", "علل": "t-q", "قارن": "t-q", "نشاط": "t-q"
  };

  function render(query, list) {
    var root = document.getElementById("searchResults");
    var countEl = document.getElementById("searchCount");
    if (!list.length) {
      countEl.textContent = query.trim() ? "لا نتائج لـ «" + query + "»" : "اكتب كلمة أو أكثر للبحث بكل دروس الموقع";
      root.innerHTML = "";
      return;
    }
    countEl.textContent = list.length + " نتيجة" + (list.length === 80 ? " (أول 80)" : "");
    var tokens = normalize(query).split(" ").filter(Boolean);
    root.innerHTML = list.map(function (item) {
      var r = item.rec;
      var cls = TYPE_CLASS[r.type] || "t-q";
      return '<a class="srcard ' + (r.ministerial ? "mn" : "") + '" href="' + r.link + '">' +
        '<div class="srmeta">' +
        '<span class="pill ' + cls + '">' + r.type + '</span>' +
        (r.ministerial ? '<span class="mnbadge">⭐ وزاري</span>' : "") +
        '<span class="srloc">' + r.chTitle + ' · ' + r.lsTitle + '</span>' +
        '</div>' +
        '<div class="srtext">' + highlight(snippet(r.text, item.pos), tokens) + '</div>' +
        '</a>';
    }).join("");
  }

  var debounceTimer = null;
  function onInput(input) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var q = input.value;
      var list = search(q);
      render(q, list);
      try {
        var url = new URL(location.href);
        if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
        history.replaceState(null, "", url);
      } catch (e) {}
    }, 120);
  }

  function init() {
    var input = document.getElementById("searchInput");
    if (!input) return;
    input.addEventListener("input", function () { onInput(input); });
    var params = new URLSearchParams(location.search);
    var initial = params.get("q") || "";
    if (initial) { input.value = initial; onInput(input); }
    else render("", []);
    input.focus();
  }
  // بيانات الدروس تصير تنحمّل ديناميكياً بعد التحقق من التفعيل (راجع search/index.html)،
  // يعني هذا السكربت غالباً يشتغل بعد ما DOMContentLoaded خلص من زمان — لازم نتحقق يدوياً.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
