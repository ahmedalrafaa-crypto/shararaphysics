/* الأسئلة الوزارية الغريبة — عرض وفلترة */
(function () {
  "use strict";
  var DATA = window.PHY_WEIRD;

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function fillSelect(id, opts, allLabel) {
    document.getElementById(id).innerHTML = '<option value="">' + allLabel + '</option>' +
      opts.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>'; }).join("");
  }

  function initFilters() {
    fillSelect("wf-chapter", Object.keys(DATA.chapters).map(function (n) {
      return { v: n, t: "ف" + n + " — " + DATA.chapters[n] };
    }), "كل الفصول");
    fillSelect("wf-type", DATA.types.map(function (t) { return { v: t, t: t }; }), "كل الأنواع");
    ["wf-chapter", "wf-type"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", render);
    });
  }

  function render() {
    var fc = document.getElementById("wf-chapter").value;
    var ft = document.getElementById("wf-type").value;
    var list = DATA.items.filter(function (q) {
      return (!fc || String(q.chapter) === fc) && (!ft || q.type === ft);
    });
    document.getElementById("w-count").textContent = "عدد الأسئلة المطابقة: " + list.length + " سؤالاً";
    document.getElementById("w-list").innerHTML = list.map(function (q, i) {
      return '<div class="pcard">' +
        '<div class="meta">' +
        '<span class="pill chap">ف' + q.chapter + ' · ' + esc(DATA.chapters[q.chapter]) + '</span>' +
        '<span class="pill type">' + esc(q.type) + '</span>' +
        '</div>' +
        '<div class="qtxt">' + esc(q.q) + '</div>' +
        '<div class="why">' + esc(q.hint) + '</div>' +
        '<button class="btn small ghost" data-sol="' + i + '">📖 أظهر الجواب</button>' +
        '<div class="sol" id="wsol-' + i + '">' + esc(q.a) + '</div>' +
        '</div>';
    }).join("") || '<p class="result-count">لا توجد أسئلة مطابقة لهذا الفلتر.</p>';
    document.querySelectorAll("#w-list [data-sol]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = document.getElementById("wsol-" + b.getAttribute("data-sol"));
        s.classList.toggle("shown");
        b.textContent = s.classList.contains("shown") ? "🙈 إخفاء الجواب" : "📖 أظهر الجواب";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.title = DATA.title + " — " + DATA.subtitle;
    document.getElementById("w-disclaimer").textContent = DATA.disclaimer;
    initFilters();
    render();
  });
})();
