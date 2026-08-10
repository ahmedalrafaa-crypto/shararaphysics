/* ============================================================
   المحرك المشترك: التقدم، الاختبارات، الأمثلة، الاحتفال
   ============================================================ */
var Phy = (function () {
  var KEY = "phy3m_progress";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

  function getLesson(ch, ls) {
    var d = load();
    return (d[ch] && d[ch].lessons && d[ch].lessons[ls]) || null;
  }
  function setLesson(ch, ls, info) {
    var d = load();
    d[ch] = d[ch] || {};
    d[ch].lessons = d[ch].lessons || {};
    var cur = d[ch].lessons[ls] || {};
    // نحتفظ بأفضل نتيجة
    if (info.stars === undefined || info.stars >= (cur.stars || 0)) {
      d[ch].lessons[ls] = { done: true, stars: info.stars !== undefined ? info.stars : (cur.stars || 0) };
    } else {
      cur.done = true;
      d[ch].lessons[ls] = cur;
    }
    save(d);
  }
  function setExam(ch, stars, score, total) {
    var d = load();
    d[ch] = d[ch] || {};
    var cur = d[ch].exam || {};
    if (!cur.stars || stars >= cur.stars) d[ch].exam = { stars: stars, score: score, total: total };
    save(d);
  }
  function getExam(ch) { var d = load(); return (d[ch] && d[ch].exam) || null; }

  function chapterPercent(ch, totalLessons) {
    var d = load(), done = 0;
    if (d[ch] && d[ch].lessons) {
      for (var k in d[ch].lessons) if (d[ch].lessons[k].done) done++;
    }
    if (d[ch] && d[ch].exam) done++;
    return Math.round(100 * done / (totalLessons + 1));
  }

  function starsStr(n) {
    var s = "";
    for (var i = 1; i <= 3; i++) s += (i <= n ? "★" : "☆");
    return s;
  }

  /* ---------- تحويل علامات الجذر إلى MathML (جذر حقيقي متصل) ----------
     المصدر في الصفحات: <span class="sqrt">√<span class="rad">المقدار</span></span>
     ونحن نحوّله إلى <math><msqrt>…</msqrt></math> */
  var SUPMAP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "−", "⁺": "+" };
  var SUBMAP = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9" };
  function mmlFromText(str) {
    var nodes = [], i = 0, n = str.length;
    function isDigit(c) { return c >= "0" && c <= "9"; }
    function isLetter(c) { return /[A-Za-zء-ي]/.test(c); }
    while (i < n) {
      var c = str[i];
      if (c === " ") { i++; continue; }
      if (SUPMAP[c]) {
        var sup = ""; while (i < n && SUPMAP[str[i]]) { sup += SUPMAP[str[i]]; i++; }
        var p = nodes.pop() || "<mn></mn>";
        nodes.push("<msup>" + p + "<mrow>" + mmlFromText(sup) + "</mrow></msup>"); continue;
      }
      if (SUBMAP[c]) {
        var sub = ""; while (i < n && SUBMAP[str[i]]) { sub += SUBMAP[str[i]]; i++; }
        var q = nodes.pop() || "<mi></mi>";
        nodes.push("<msub>" + q + "<mn>" + sub + "</mn></msub>"); continue;
      }
      if (isDigit(c)) {
        var num = ""; while (i < n && (isDigit(str[i]) || str[i] === ".")) { num += str[i]; i++; }
        nodes.push("<mn>" + num + "</mn>"); continue;
      }
      if (isLetter(c)) {
        var id = ""; while (i < n && isLetter(str[i])) { id += str[i]; i++; }
        nodes.push("<mi>" + id + "</mi>"); continue;
      }
      nodes.push("<mo>" + c + "</mo>"); i++;
    }
    return nodes.join("");
  }
  function upgradeSqrts(root) {
    (root || document).querySelectorAll(".sqrt").forEach(function (el) {
      var rad = el.querySelector(".rad");
      var txt = rad ? rad.textContent : el.textContent.replace("√", "");
      var holder = document.createElement("span");
      holder.innerHTML = '<math><msqrt><mrow>' + mmlFromText(txt) + '</mrow></msqrt></math>';
      el.replaceWith(holder.firstChild);
    });
  }
  document.addEventListener("DOMContentLoaded", function () { upgradeSqrts(document); });

  /* ---------- confetti ---------- */
  function confetti() {
    var c = document.createElement("canvas");
    c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999";
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    var x = c.getContext("2d");
    var colors = ["#6c5ce7", "#4d96ff", "#ff6b6b", "#ffc93c", "#2ecc8f", "#ff8fab"];
    var parts = [];
    for (var i = 0; i < 130; i++) parts.push({
      x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5,
      vy: 2 + Math.random() * 3.5, vx: -1.5 + Math.random() * 3,
      s: 6 + Math.random() * 8, r: Math.random() * Math.PI,
      col: colors[i % colors.length]
    });
    var t0 = Date.now();
    (function tick() {
      x.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) {
        p.y += p.vy; p.x += p.vx; p.r += .08;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r);
        x.fillStyle = p.col; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6);
        x.restore();
      });
      if (Date.now() - t0 < 3200) requestAnimationFrame(tick);
      else c.remove();
    })();
  }

  /* ============================================================
     طبقة تحليل الأداء: تسجيل محاولة كل سؤال على حدة
     مخزن مستقل تماماً عن التقدّم، فلا يمسّ أي سلوك قائم.
     ============================================================ */
  var AKEY = "phy3m_analytics";
  function getAttempts() {
    try { return JSON.parse(localStorage.getItem(AKEY)) || []; }
    catch (e) { return []; }
  }
  function saveAttempts(a) {
    // نحتفظ بآخر 800 محاولة فقط تفادياً لتضخّم التخزين
    if (a.length > 800) a = a.slice(a.length - 800);
    try { localStorage.setItem(AKEY, JSON.stringify(a)); } catch (e) {}
  }
  function recordAttempt(rec) { var a = getAttempts(); a.push(rec); saveAttempts(a); }
  function clearAttempts() { try { localStorage.removeItem(AKEY); } catch (e) {} }

  // سياق الصفحة من المسار: أي فصل وأي درس/اختبار (يعمل تلقائياً بلا تعديل الاختبارات)
  function pageContext() {
    var m = (location.pathname || "").match(/ch([0-9]+)\/(lesson[0-9]+|exam)/i);
    if (!m) return { ch: null, node: null };
    return { ch: "ch" + m[1], node: m[2].toLowerCase() };
  }
  // عنوان الموضوع الفرعي من ترويسة الصفحة، بعد تنظيف الرموز التعبيرية
  function pageTopic() {
    var h = document.querySelector(".hero h1") || document.querySelector("h1");
    var t = (h ? h.textContent : (document.title || "")) || "";
    return t.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}←-⇿⬀-⯿️]/gu, "").trim();
  }
  // تخمين نوع المهارة عند عدم وسمها يدوياً بحقل skillType/subTopic في السؤال
  function inferSkill(item) {
    if (item.skillType) return item.skillType;
    if (item.skill) return item.skill;
    var text = (item.q || "") + " " + ((item.opts || []).join(" "));
    var hasNum = /[0-9٠-٩]/.test(text);
    var hasMath = /[×÷=]|10[⁻⁰¹²³⁴⁵⁶⁷⁸⁹^-]|μ|Ω|N\/C|m\/s|\bcm\b|μC|\bmC\b/.test(text);
    var lawWords = /(قانون|كولوم|أوم|المجال الكهربائي|القوة الكهربائية|فرق الجهد|القدرة|نسبة التحويل|الكفاءة|E\s*=|F\s*=|V\s*=|P\s*=|Q\s*=|I\s*=|R\s*=)/;
    var recallWords = /(أول من|اكتشف|عام\s*[0-9]|سنة\s*[0-9]|يسمى|تسمى|أطلق|من هو|العالِم|العالم|اخترع|أطلقت)/;
    if (hasMath && hasNum) return lawWords.test(text) ? "تطبيق قانون" : "حساب";
    if (recallWords.test(text)) return "تذكّر";
    return "مفهوم";
  }

  /* ---------- محرك الاختبار ----------
     questions: [{q, opts:[..], a: index, why, skillType?, subTopic?}] */
  function quiz(containerId, questions, opts) {
    opts = opts || {};
    var host = document.getElementById(containerId);
    var score = 0, answered = 0;
    host.innerHTML = "";
    host.className = "quiz";
    // سياق التحليل: يُلتقط تلقائياً من الصفحة (يُتاح تجاوزه عبر opts.ch/opts.topic)
    var anCtx = pageContext();
    if (opts.ch) anCtx.ch = opts.ch;
    var anTopic = opts.topic || pageTopic();
    var anLast = Date.now();

    questions.forEach(function (item, qi) {
      var div = document.createElement("div");
      div.className = "qitem";
      var h = '<div class="qtext">' + (qi + 1) + ". " + item.q + "</div>";
      if (item.figure) h += '<div class="qfig">' + item.figure + "</div>";
      h += '<div class="opts">';
      item.opts.forEach(function (o, oi) {
        h += '<button class="qopt" data-q="' + qi + '" data-o="' + oi + '">' + o + "</button>";
      });
      h += "</div>";
      if (item.why) h += '<div class="qexpl">💡 ' + item.why + "</div>";
      div.innerHTML = h;
      host.appendChild(div);
    });

    var result = document.createElement("div");
    result.className = "quiz-result";
    host.appendChild(result);

    host.addEventListener("click", function (e) {
      var b = e.target.closest(".qopt");
      if (!b || b.disabled) return;
      var qi = +b.dataset.q, oi = +b.dataset.o;
      var item = questions[qi];
      var wrap = b.closest(".qitem");
      wrap.querySelectorAll(".qopt").forEach(function (o) { o.disabled = true; });
      var correctBtn = wrap.querySelectorAll(".qopt")[item.a];
      correctBtn.classList.add("correct");
      var ok = (oi === item.a);
      if (ok) { score++; }
      else { b.classList.add("wrong"); }
      // تسجيل المحاولة في طبقة التحليل (يُتجاهل بهدوء خارج صفحات الفصول)
      if (anCtx.ch) {
        recordAttempt({
          ch: anCtx.ch, node: anCtx.node || "quiz", topic: anTopic,
          skill: inferSkill(item), sub: item.subTopic || anTopic,
          qi: qi, ok: ok, ms: Date.now() - anLast, ts: Date.now()
        });
      }
      anLast = Date.now();
      var ex = wrap.querySelector(".qexpl");
      if (ex) ex.classList.add("shown");
      answered++;
      if (answered === questions.length) finish();
    });

    function finish() {
      var pct = score / questions.length;
      var stars = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : pct >= 0.5 ? 1 : 0;
      var msg = stars === 3 ? "مبدع! 🏆 علامة كاملة تقريباً"
              : stars === 2 ? "أحسنت! 👏 نتيجة جميلة"
              : stars === 1 ? "جيد، أعد المحاولة لنتيجة أفضل 💪"
              : "لا بأس! راجع الدرس وحاول مجدداً 🌱";
      result.innerHTML =
        '<div class="big">' + score + " / " + questions.length + "</div>" +
        '<div class="stars-line">' + starsStr(stars) + "</div>" +
        "<p>" + msg + "</p>" +
        '<button class="btn ghost" style="margin-top:10px" onclick="location.reload()">🔁 إعادة المحاولة</button>';
      result.classList.add("shown");
      result.scrollIntoView({ behavior: "smooth", block: "center" });
      if (stars >= 2) confetti();
      if (opts.onDone) opts.onDone(stars, score, questions.length);
    }
  }

  /* ---------- كشف خطوات الحل ---------- */
  function initExamples() {
    document.querySelectorAll(".example").forEach(function (ex) {
      var steps = ex.querySelectorAll(".step");
      if (!steps.length) return;
      var btn = document.createElement("button");
      btn.className = "btn small";
      btn.textContent = "👀 أظهر الخطوة الأولى";
      var i = 0;
      btn.addEventListener("click", function () {
        steps[i].classList.add("shown");
        i++;
        if (i >= steps.length) { btn.remove(); }
        else btn.textContent = "➕ الخطوة التالية (" + (i + 1) + " من " + steps.length + ")";
      });
      ex.appendChild(btn);
    });
  }

  document.addEventListener("DOMContentLoaded", initExamples);

  /* ---------- زر الإبلاغ عن خطأ (يُحقن تلقائياً أسفل كل صفحة قرب الفوتر) ---------- */
  var WHATSAPP_NUMBER = "9647800155157";
  function initReportError() {
    if (document.getElementById("reportBtn")) return; // مضاف يدوياً بالصفحة نفسها (مكان أدق)
    if (!/\/chapters\//.test(location.pathname)) return; // فقط الصفحات التدريسية (دروس/فصول/أسئلة الفيزياء)
    var footer = document.querySelector("footer.site");
    if (!footer) return;
    var box = document.createElement("div");
    box.className = "notebox";
    box.innerHTML =
      '<b>📩 لاحظت خطأ؟</b> إذا لاحظت أي خطأ بهذه الصفحة، بلّغ الأستاذ أحمد فورًا وسيراجعها.' +
      '<br><a class="btn ghost small" id="reportBtn" target="_blank" rel="noopener noreferrer" href="#" style="margin-top:10px">🐞 بلّغ عن خطأ عبر واتساب</a>';
    footer.insertAdjacentElement("beforebegin", box);
    var waMsg = "مرحباً أستاذ أحمد 👋\nلاحظت خطأ بصفحة: " + document.title + "\n" + location.href + "\n\nالخطأ: ";
    document.getElementById("reportBtn").href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(waMsg);
  }
  document.addEventListener("DOMContentLoaded", initReportError);

  return {
    load: load, getLesson: getLesson, setLesson: setLesson,
    setExam: setExam, getExam: getExam,
    chapterPercent: chapterPercent, starsStr: starsStr,
    quiz: quiz, confetti: confetti, upgradeSqrts: upgradeSqrts,
    getAttempts: getAttempts, clearAttempts: clearAttempts,
    recordAttempt: recordAttempt, inferSkill: inferSkill,
    pageContext: pageContext, pageTopic: pageTopic
  };
})();
