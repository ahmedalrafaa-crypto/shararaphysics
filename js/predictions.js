/* التوقعات الوزارية — العرض والفلترة ولوحة الأولويات ووضع الامتحان */
(function () {
  "use strict";
  var DATA = window.PHY_PREDICTIONS, STATS = window.PHY_STATS, PRIO = window.PHY_PRIORITY;
  var CHNAMES = {
    1: "الكهربائية الساكنة", 2: "المغناطيسية", 3: "التيار والمقاومة وأوم",
    4: "الخلايا والبطاريات", 5: "القدرة والأمان الكهربائي", 6: "المغناطيسية الكهربائية والحث",
    7: "المحولات", 8: "الطاقة المتجددة", 9: "الغلاف الجوي والاتصالات"
  };
  var CONFCLASS = { "شبه مؤكد": "conf-sure", "مرجّح": "conf-likely", "محتمل": "conf-maybe", "حقيقي": "conf-real" };
  var PICK = ["أ", "ب", "ج", "د", "هـ", "و"];

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function solHtml(s) {
    if (!s) return "سؤال رسم/مخطط أو تعبيري — راجع الحل النموذجي في الملزمة.";
    return esc(s).replace(/([A-Za-z0-9πΩµμ][^؀-ۿ]*[=×/+][^؀-ۿ]*)/g, function (m) { return '<span class="formula-line">' + m + '</span>'; });
  }
  // flatten a model's questions to individual items (part A + part B items)
  function itemsOf(m) {
    var out = [];
    m.questions.forEach(function (q) {
      if (q.a) out.push(q.a);
      if (q.b && q.b.items) q.b.items.forEach(function (it) { out.push(it); });
    });
    return out;
  }

  function isUpcoming(m) { return m.year === "2026" && m.door === "الدور الثاني"; }

  var ALL = [];
  DATA.models.forEach(function (m) {
    itemsOf(m).forEach(function (p) {
      ALL.push({ year: m.year, door: m.door, real: m.real, upcoming: isUpcoming(m), chapter: p.chapter, topic: p.topic, type: p.type, marks: p.marks, text: p.text, confidence: p.confidence, why: p.why, solution: p.solution });
    });
  });

  // ================= STATS =================
  function bars(host, rows, maxv, fmt) {
    document.getElementById(host).innerHTML = rows.map(function (r) {
      return '<div class="barrow"><span class="lbl">' + esc(r.lbl) + '</span><span class="track"><span class="fill" style="width:' + (100 * r.v / maxv) + '%"></span></span><span class="val">' + fmt(r) + '</span></div>';
    }).join("");
  }
  function renderStats() {
    var cw = STATS.chapter_weight.slice().sort(function (a, b) { return b.count - a.count; });
    bars("stat-chapters", cw.map(function (c) { return { lbl: "ف" + c.chapter + " " + CHNAMES[c.chapter], v: c.count, pct: c.pct }; }), cw[0].count, function (r) { return r.pct + "%"; });
    var td = Object.entries(STATS.type_distribution).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    bars("stat-types", td.map(function (e) { return { lbl: e[0], v: e[1] }; }), td[0][1], function (r) { return r.v; });
  }

  // ================= PRIORITY BOARD =================
  var RKEY = "phy_revision_done";
  function loadDone() { try { return JSON.parse(localStorage.getItem(RKEY)) || {}; } catch (e) { return {}; } }
  function saveDone(d) { localStorage.setItem(RKEY, JSON.stringify(d)); }
  function renderPriority() {
    var done = loadDone();
    function col(hostId, list, extra) {
      var h = list.map(function (t) {
        var id = t.chapter + "|" + t.topic;
        var checked = done[id] ? " checked" : "";
        var cls = done[id] ? " checked" : "";
        return '<label class="prioitem' + cls + '" data-id="' + esc(id) + '"><input type="checkbox"' + checked + '>' +
          '<span class="pt">' + esc(t.topic) + ' <span class="tag">ف' + t.chapter + " · " + extra(t) + '</span></span></label>';
      }).join("");
      document.getElementById(hostId).innerHTML = h;
    }
    col("prio-must", PRIO.must, function (t) { return t.yc + "/11 سنة"; });
    col("prio-rotate", PRIO.rotate.slice(0, 12), function (t) { return t.yc + "/11"; });
    col("prio-comeback", PRIO.comeback, function (t) { return "آخر ظهور " + t.last; });
    updatePrioProgress();
    document.querySelectorAll(".prioitem input").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var lab = cb.closest(".prioitem"), id = lab.getAttribute("data-id");
        var d = loadDone();
        if (cb.checked) { d[id] = 1; lab.classList.add("checked"); } else { delete d[id]; lab.classList.remove("checked"); }
        saveDone(d); updatePrioProgress();
      });
    });
  }
  function updatePrioProgress() {
    var total = PRIO.must.length + Math.min(PRIO.rotate.length, 12) + PRIO.comeback.length;
    var done = Object.keys(loadDone()).length;
    document.getElementById("prio-count").textContent = "أنجزت " + done + " من " + total + " موضوعاً";
    document.getElementById("prio-fill").style.width = (total ? 100 * done / total : 0) + "%";
    if (done >= total && total > 0 && window.Phy && Phy.confetti) Phy.confetti();
  }

  // ================= FILTERS + BROWSE =================
  function fillSelect(id, opts, allLabel) {
    document.getElementById(id).innerHTML = '<option value="">' + allLabel + '</option>' +
      opts.map(function (o) { return '<option value="' + esc(o.v) + '">' + esc(o.t) + '</option>'; }).join("");
  }
  function initFilters() {
    fillSelect("f-year", ["2026", "2027", "2028", "2029", "2030"].map(function (y) { return { v: y, t: y }; }), "كل السنوات");
    fillSelect("f-door", [{ v: "الدور الأول", t: "الدور الأول" }, { v: "الدور الثاني", t: "الدور الثاني" }], "كل الأدوار");
    fillSelect("f-chapter", Object.keys(CHNAMES).map(function (n) { return { v: n, t: "ف" + n + " — " + CHNAMES[n] }; }), "كل الفصول");
    fillSelect("f-type", Array.from(new Set(ALL.map(function (q) { return q.type; }))).map(function (t) { return { v: t, t: t }; }), "كل الأنواع");
    ["f-year", "f-door", "f-chapter", "f-type"].forEach(function (id) { document.getElementById(id).addEventListener("change", renderBrowse); });
  }
  function renderBrowse() {
    var fy = document.getElementById("f-year").value, fd = document.getElementById("f-door").value,
      fc = document.getElementById("f-chapter").value, ft = document.getElementById("f-type").value;
    var list = ALL.filter(function (q) {
      return (!fy || q.year === fy) && (!fd || q.door === fd) && (!fc || String(q.chapter) === fc) && (!ft || q.type === ft);
    });
    document.getElementById("result-count").textContent = "عدد الأسئلة المطابقة: " + list.length + " سؤالاً";
    document.getElementById("browse-list").innerHTML = list.map(function (q, i) {
      var realTag = q.real ? '<span class="pill real">حقيقي · رسمي</span>' : '';
      var upTag = q.upcoming ? '<span class="pill upcoming">🔜 الامتحان القادم</span>' : '';
      return '<div class="pcard' + (q.real ? ' realcard' : '') + (q.upcoming ? ' upcard' : '') + '">' +
        '<div class="meta">' +
        '<span class="pill year">' + esc(q.year) + '</span><span class="pill door">' + esc(q.door) + '</span>' + realTag + upTag +
        '<span class="pill chap">ف' + q.chapter + " · " + esc(q.topic) + '</span>' +
        '<span class="pill type">' + esc(q.type) + '</span><span class="pill marks">' + q.marks + '</span>' +
        '<span class="conf ' + (CONFCLASS[q.confidence] || 'conf-maybe') + '">' + esc(q.confidence) + '</span></div>' +
        '<div class="qtxt">' + esc(q.text) + '</div>' +
        '<div class="why">' + esc(q.why) + '</div>' +
        '<button class="btn small ghost" data-sol="' + i + '">📖 أظهر الحل</button>' +
        '<div class="sol" id="sol-' + i + '">' + solHtml(q.solution) + '</div></div>';
    }).join("") || '<p class="result-count">لا توجد أسئلة مطابقة.</p>';
    document.querySelectorAll("#browse-list [data-sol]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = document.getElementById("sol-" + b.getAttribute("data-sol"));
        s.classList.toggle("shown");
        b.textContent = s.classList.contains("shown") ? "🙈 إخفاء الحل" : "📖 أظهر الحل";
      });
    });
  }

  // ================= EXAM MODE =================
  var timerInt = null;
  function fillExamPicker() {
    var order = DATA.models.map(function (m, i) { return i; }).sort(function (a, b) {
      return (isUpcoming(DATA.models[b]) - isUpcoming(DATA.models[a])); // upcoming first
    });
    document.getElementById("exam-pick").innerHTML = order.map(function (i) {
      var m = DATA.models[i];
      var pre = isUpcoming(m) ? "🔜 (الامتحان القادم) " : (m.real ? "★ (حقيقي) " : "");
      return '<option value="' + i + '">' + pre + "امتحان " + esc(m.year) + " — " + esc(m.door) + '</option>';
    }).join("");
  }
  function marksBadge(v) { return '<span class="pill marks" style="font-size:.65rem">' + v + '</span>'; }
  function startExam() {
    var m = DATA.models[+document.getElementById("exam-pick").value];
    var h = '<div class="exam-instr">📋 ' + esc(m.instructions) + '</div>';
    m.questions.forEach(function (q) {
      h += '<div class="exq-block"><div class="qnum"><span>السؤال ' + esc(q.number) + '</span><span class="m">' + q.marks + ' درجة</span></div>';
      if (q.a) {
        h += '<div class="exq-part"><div class="pt">(أ) ' + esc(q.a.text) + ' ' + marksBadge(q.a.marks) + '</div><div class="psol">' + solHtml(q.a.solution) + '</div></div>';
      }
      if (q.b) {
        h += '<div class="exq-part"><div class="pt" style="color:var(--violet-deep)">' + (q.a ? '(ب) ' : '') + esc(q.b.instruction) + '</div>';
        q.b.items.forEach(function (it, k) {
          h += '<div class="exq-sub"><div class="pt">' + (k + 1) + ") " + esc(it.text) + ' ' + marksBadge(it.marks) + '</div><div class="psol">' + solHtml(it.solution) + '</div></div>';
        });
        h += '</div>';
      }
      h += '</div>';
    });
    document.getElementById("exam-body").innerHTML = h;
    var pre = isUpcoming(m) ? "🔜 الامتحان القادم (متوقّع) — " : (m.real ? "★ امتحان حقيقي رسمي — " : "امتحان متوقّع — ");
    document.getElementById("exam-title").textContent = pre + m.year + " — " + m.door;
    document.getElementById("exam-conf").textContent = m.real ? "الدور الأول 2025/2026 (ورقة رسمية فعلية)" : (isUpcoming(m) ? "أقرب امتحان قادم فعلي — درجة الثقة: " + m.overall_confidence : "درجة الثقة العامة: " + m.overall_confidence);
    document.querySelector(".browsewrap").classList.add("hidden");
    document.getElementById("examwrap").classList.add("active");
    document.getElementById("reveal-btn").textContent = "🔓 إنهاء وإظهار الحلول";
    window.scrollTo(0, 0);
    startTimer(m.duration_minutes);
  }
  function startTimer(mins) {
    if (timerInt) clearInterval(timerInt);
    var left = mins * 60, t = document.getElementById("exam-timer");
    function tick() {
      var mm = Math.floor(left / 60), ss = left % 60;
      t.textContent = (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss;
      if (left <= 600) t.classList.add("warn");
      if (left <= 0) { clearInterval(timerInt); revealSolutions(); t.textContent = "انتهى الوقت ⏰"; }
      left--;
    }
    tick(); timerInt = setInterval(tick, 1000);
  }
  function revealSolutions() {
    document.querySelectorAll("#exam-body .psol").forEach(function (s) { s.classList.add("shown"); });
    document.getElementById("reveal-btn").textContent = "✅ تم عرض الحلول";
  }
  function exitExam() {
    if (timerInt) clearInterval(timerInt);
    document.getElementById("examwrap").classList.remove("active");
    document.querySelector(".browsewrap").classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderStats(); renderPriority(); initFilters(); renderBrowse(); fillExamPicker();
    document.getElementById("start-exam").addEventListener("click", startExam);
    document.getElementById("reveal-btn").addEventListener("click", revealSolutions);
    document.getElementById("exit-exam").addEventListener("click", exitExam);
    document.getElementById("print-exam").addEventListener("click", function () { window.print(); });
  });
})();
