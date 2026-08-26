/* التوقعات الوزارية — السادس الإعدادي: عرض وفلترة وإحصائيات */
(function () {
  "use strict";
  var DATA = window.PHY_PREDICTIONS_G6;

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function renderStats() {
    var total = DATA.items.length || 1;
    var counts = {};
    DATA.items.forEach(function (q) { counts[q.chapter] = (counts[q.chapter] || 0) + 1; });
    var rows = Object.keys(DATA.chapters).map(function (n) {
      return { chapter: n, name: DATA.chapters[n], count: counts[n] || 0 };
    }).sort(function (a, b) { return b.count - a.count; });
    var max = rows[0] ? rows[0].count : 1;
    document.getElementById("g6stat-chapters").innerHTML = rows.map(function (r) {
      var pct = Math.round(100 * r.count / total);
      return '<div class="barrow"><span class="lbl">ف' + r.chapter + ' ' + esc(r.name) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + (100 * r.count / max) + '%"></span></span>' +
        '<span class="val">' + r.count + ' · ' + pct + '%</span></div>';
    }).join("");

    var typeCounts = {};
    DATA.items.forEach(function (q) { typeCounts[q.type] = (typeCounts[q.type] || 0) + 1; });
    var trows = Object.entries(typeCounts).sort(function (a, b) { return b[1] - a[1]; });
    var tmax = trows[0] ? trows[0][1] : 1;
    document.getElementById("g6stat-types").innerHTML = trows.map(function (e) {
      var pct = Math.round(100 * e[1] / total);
      return '<div class="barrow"><span class="lbl">' + esc(e[0]) + '</span>' +
        '<span class="track"><span class="fill" style="width:' + (100 * e[1] / tmax) + '%"></span></span>' +
        '<span class="val">' + e[1] + ' · ' + pct + '%</span></div>';
    }).join("");
  }

  function renderAnalysis() {
    var A = DATA.analysis;
    if (!A) return;
    var noteEl = document.getElementById("g6-bank-note");
    if (noteEl) noteEl.textContent = A.bank_note || "";
    var introEl = document.getElementById("g6-focus-intro");
    if (introEl) introEl.textContent = A.focus_intro || "";

    var WEIGHT_COLOR = { "عالٍ": "#16a34a", "متوسط": "#eab308", "منخفض": "#f43f5e" };
    var focusEl = document.getElementById("g6-focus");
    if (focusEl && A.chapters) {
      focusEl.innerHTML = A.chapters.map(function (c) {
        var color = WEIGHT_COLOR[c.weight] || "#3b6ef5";
        return '<div class="priocol" style="border-top-color:' + color + '">' +
          '<h3>ف' + c.n + ' ' + esc(DATA.chapters[c.n] || "") +
          '<span style="margin-inline-start:auto;font-size:.68rem;font-weight:800;color:#fff;background:' + color +
          ';border-radius:999px;padding:2px 9px">وزن ' + esc(c.weight) + '</span></h3>' +
          '<div class="sub">النوع الغالب: ' + esc(c.types) + '</div>' +
          '<div style="font-size:.85rem;font-weight:600;line-height:1.9;color:var(--ink)">' + esc(c.focus) + '</div>' +
          '</div>';
      }).join("");
    }

    var guideEl = document.getElementById("g6-types-guide");
    if (guideEl && A.types) {
      guideEl.innerHTML = A.types.map(function (t) {
        return '<div class="fcard"><b>' + esc(t.name) + '</b>' +
          '<div style="font-size:.82rem;font-weight:600;line-height:1.75">' + esc(t.desc) + '</div></div>';
      }).join("");
    }
  }

  function fillSelect(id, opts, allLabel) {
    document.getElementById(id).innerHTML = '<option value="">' + allLabel + '</option>' +
      opts.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>'; }).join("");
  }

  function initFilters() {
    fillSelect("g6f-chapter", Object.keys(DATA.chapters).map(function (n) {
      return { v: n, t: "ف" + n + " — " + DATA.chapters[n] };
    }), "كل الفصول");
    fillSelect("g6f-type", Array.from(new Set(DATA.items.map(function (q) { return q.type; }))).map(function (t) { return { v: t, t: t }; }), "كل الأنواع");
    ["g6f-chapter", "g6f-type"].forEach(function (id) {
      document.getElementById(id).addEventListener("change", render);
    });
  }

  function render() {
    var fc = document.getElementById("g6f-chapter").value;
    var ft = document.getElementById("g6f-type").value;
    var list = DATA.items.filter(function (q) {
      return (!fc || String(q.chapter) === fc) && (!ft || q.type === ft);
    });
    document.getElementById("g6-count").textContent = "عدد الأسئلة المطابقة: " + list.length + " سؤالاً";
    document.getElementById("g6-list").innerHTML = list.map(function (q, i) {
      return '<div class="pcard">' +
        '<div class="meta">' +
        '<span class="pill chap">ف' + q.chapter + ' · ' + esc(q.topic) + '</span>' +
        '<span class="pill type">' + esc(q.type) + '</span>' +
        '<span class="pill marks" style="background:#fffbeb;color:#b45309">' + esc(q.years) + '</span>' +
        '</div>' +
        '<div class="qtxt">' + esc(q.text) + '</div>' +
        '<button class="btn small ghost" data-sol="' + i + '">📖 أظهر الحل</button>' +
        '<div class="sol" id="g6sol-' + i + '">' + esc(q.solution).replace(/\n/g, "<br>") + '</div>' +
        '</div>';
    }).join("") || '<p class="result-count">لا توجد أسئلة مطابقة لهذا الفلتر.</p>';
    document.querySelectorAll("#g6-list [data-sol]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = document.getElementById("g6sol-" + b.getAttribute("data-sol"));
        s.classList.toggle("shown");
        b.textContent = s.classList.contains("shown") ? "🙈 إخفاء الحل" : "📖 أظهر الحل";
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("g6-disclaimer").textContent = DATA.disclaimer;
    document.getElementById("g6-basedon").textContent = DATA.based_on;
    renderAnalysis();
    renderStats();
    initFilters();
    render();
  });
})();
