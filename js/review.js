/* ============================================================
   محرك صفحة "مراجعة سريعة": يعرض مفاهيم/قوانين/ملاحظات/جداول
   ويميّز المحتوى الوزاري، مع وضع "الأهم فقط" للمراجعة الأخيرة.
   يعتمد على window.PHY_LESSONS (js/lessons-data.js) و PHY_REVIEW_CH.
   ============================================================ */
(function () {
  "use strict";
  if (typeof window.PHY_LESSONS === "undefined" || typeof window.PHY_REVIEW_CH === "undefined") return;

  var ALL = window.PHY_LESSONS;
  var CH = window.PHY_REVIEW_CH;

  function chLessons(ch) {
    return ALL.filter(function (l) { return l.chapter_number === ch; })
      .sort(function (a, b) { return a.order_index - b.order_index; });
  }
  function chTitle(ch) {
    var l = ALL.filter(function (x) { return x.chapter_number === ch; })[0];
    return l ? l.chapter_title : ("الفصل " + ch);
  }

  function mnBadge() { return '<span class="mnbadge">⭐ وزاري</span>'; }

  function renderConcepts(list) {
    if (!list.length) return "";
    var h = '<div class="section-title small"><span class="ico">📖</span> المفاهيم</div>';
    list.forEach(function (c) {
      h += '<div class="defbox revitem' + (c.ministerial ? " mn" : "") + '" data-mn="' + (c.ministerial ? 1 : 0) + '">' +
        (c.ministerial ? mnBadge() : "") +
        '<b class="term">' + c.term + '</b> ' + c.text + '</div>';
    });
    return h;
  }

  function renderLaws(list) {
    if (!list.length) return "";
    var h = '<div class="section-title small"><span class="ico">📐</span> القوانين</div><div class="revlaws">';
    list.forEach(function (law) {
      h += '<div class="fcard revlaw"><b>' + law.name + '</b><div class="eq">' + law.formula + '</div>' +
        (law.variables_note ? '<small>' + law.variables_note + '</small>' : "") + '</div>';
    });
    return h + '</div>';
  }

  function renderNotes(list) {
    if (!list.length) return "";
    var h = '<div class="section-title small"><span class="ico">📝</span> ملاحظات</div>';
    list.forEach(function (n) {
      h += '<div class="notebox revitem' + (n.ministerial ? " mn" : "") + '" data-mn="' + (n.ministerial ? 1 : 0) + '">' +
        (n.ministerial ? mnBadge() : "") +
        (n.heading ? '<b>' + n.heading + '</b>' : "") + '<ul>';
      n.items.forEach(function (it) { h += '<li>' + it + '</li>'; });
      h += '</ul></div>';
    });
    return h;
  }

  function renderTables(list) {
    if (!list.length) return "";
    var h = '<div class="section-title small"><span class="ico">📊</span> جداول</div>';
    list.forEach(function (t) {
      h += '<div class="revitem' + (t.ministerial ? " mn" : "") + '" data-mn="' + (t.ministerial ? 1 : 0) + '">' +
        (t.ministerial ? mnBadge() : "") +
        (t.caption ? '<div class="revtable-cap">' + t.caption + '</div>' : "") +
        '<div class="tblwrap"><table class="nice"><tr>';
      t.headers.forEach(function (hd) { h += '<th>' + hd + '</th>'; });
      h += '</tr>';
      t.rows.forEach(function (row) {
        h += '<tr>'; row.forEach(function (cell) { h += '<td>' + cell + '</td>'; }); h += '</tr>';
      });
      h += '</table></div></div>';
    });
    return h;
  }

  function renderMinisterialQA(list) {
    var mn = list.filter(function (q) { return q.ministerial; });
    if (!mn.length) return "";
    var h = '<div class="section-title small"><span class="ico">⭐</span> أسئلة وزارية سريعة</div>';
    mn.forEach(function (qa) {
      if (!qa.answer) return; // سؤال جدول منقول لـ tables[]، معروض هناك
      h += '<div class="revqa"><div class="revq"><span class="tag">' + qa.type + '</span> ' + qa.question + '</div>' +
        '<div class="reva">' + qa.answer.replace(/\n/g, "<br>") + '</div></div>';
    });
    return h;
  }

  function lessonStats(l) {
    var mnCount = l.concepts.filter(function (c) { return c.ministerial; }).length +
      l.notes.filter(function (n) { return n.ministerial; }).length +
      l.tables.filter(function (t) { return t.ministerial; }).length +
      l.qa.filter(function (q) { return q.ministerial; }).length;
    var bits = [];
    if (l.concepts.length) bits.push(l.concepts.length + " مفهوم");
    if (l.laws.length) bits.push(l.laws.length + " قانون");
    if (l.notes.length) bits.push(l.notes.length + " ملاحظة");
    if (l.tables.length) bits.push(l.tables.length + " جدول");
    if (mnCount) bits.push("⭐ " + mnCount + " وزاري");
    return bits.join(" · ");
  }

  function renderLesson(l) {
    var body = renderConcepts(l.concepts) + renderLaws(l.laws) + renderNotes(l.notes) +
      renderTables(l.tables) + renderMinisterialQA(l.qa);
    if (!body) body = '<p class="revempty">لا يوجد محتوى مركّز لهذا الدرس (راجع الدرس كاملاً).</p>';
    body += '<p class="revempty revempty-mn" hidden>🌱 لا يوجد محتوى وزاري مسجّل بهذا الدرس تحديداً — راجعه كاملاً بالأعلى، أو أوقف "الأهم فقط".</p>';
    return '<details class="revlesson" open>' +
      '<summary><b>' + l.lesson_title + '</b><span class="revstats">' + lessonStats(l) + '</span></summary>' +
      '<div class="revbody">' + body + '</div></details>';
  }

  // يخفي عناوين الأقسام (مثل "📖 المفاهيم") إذا صار كل محتواها مخفياً بوضع "الأهم فقط"،
  // ويُظهر رسالة "لا يوجد محتوى وزاري" إذا صار الدرس بالكامل فارغاً بهذا الوضع
  function updateSectionVisibility() {
    var mnOnly = document.body.classList.contains("mn-only");
    document.querySelectorAll(".revbody").forEach(function (body) {
      var currentTitle = null, groupHasVisible = false, anyVisible = false;
      var mnEmptyNote = body.querySelector(".revempty-mn");
      var alwaysEmpty = body.querySelector(".revempty:not(.revempty-mn)"); // "لا يوجد محتوى مركّز" الثابتة
      function flush() {
        if (currentTitle) currentTitle.style.display = groupHasVisible ? "" : "none";
        if (groupHasVisible) anyVisible = true;
      }
      Array.prototype.forEach.call(body.children, function (el) {
        if (el.classList.contains("section-title")) {
          flush();
          currentTitle = el; groupHasVisible = false;
        } else if (el.classList.contains("revitem")) {
          if (!mnOnly || el.dataset.mn === "1") groupHasVisible = true;
        } else if (el.classList.contains("revlaws") || el.classList.contains("revqa")) {
          groupHasVisible = true; // القوانين والأسئلة الوزارية تُعرض دائماً
        }
      });
      flush();
      if (mnEmptyNote) mnEmptyNote.hidden = !mnOnly || anyVisible || !!alwaysEmpty;
    });
  }

  function renderChapterPicker(select) {
    var seen = {}, opts = "";
    ALL.forEach(function (l) {
      if (seen[l.chapter_number]) return;
      seen[l.chapter_number] = true;
      opts += '<option value="' + l.chapter_number + '"' + (l.chapter_number === CH ? " selected" : "") + '>' +
        l.chapter_title + '</option>';
    });
    select.innerHTML = opts;
    select.addEventListener("change", function () {
      location.href = "../ch" + select.value + "/review.html";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.getElementById("reviewRoot");
    if (!root) return;
    var lessons = chLessons(CH);
    var titleEl = document.getElementById("reviewTitle");
    if (titleEl) titleEl.textContent = "📋 مراجعة سريعة — " + chTitle(CH);

    root.innerHTML = lessons.map(renderLesson).join("");

    var picker = document.getElementById("reviewChapterPicker");
    if (picker) renderChapterPicker(picker);

    var toggle = document.getElementById("mnOnlyToggle");
    if (toggle) {
      toggle.addEventListener("change", function () {
        document.body.classList.toggle("mn-only", toggle.checked);
        updateSectionVisibility();
      });
    }

    var printBtn = document.getElementById("reviewPrintBtn");
    if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

    var expandBtn = document.getElementById("reviewExpandBtn");
    if (expandBtn) {
      expandBtn.addEventListener("click", function () {
        var all = document.querySelectorAll(".revlesson");
        var anyClosed = Array.prototype.some.call(all, function (d) { return !d.open; });
        all.forEach(function (d) { d.open = anyClosed; });
        expandBtn.textContent = anyClosed ? "🔽 طي الكل" : "🔼 فتح الكل";
      });
    }
  });
})();
