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

  /* ---------- تحويل الجذور والكسور إلى MathML (شكل الكتاب) ----------
     المصدر في الصفحات:
       جذر:  <span class="sqrt">√<span class="rad">المقدار</span></span>   (data-n="3" = تكعيبي)
       كسر:  <span class="frac"><span class="num">البسط</span><span class="den">المقام</span></span>
     ويجوز تداخلهما (جذر داخل مقام، كسر تحت جذر). */
  var SUPMAP = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁻": "−", "⁺": "+" };
  var SUBMAP = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "ₑ": "e" };
  function mmlFromText(str) {
    var nodes = [], i = 0, n = str.length;
    function isDigit(c) { return c >= "0" && c <= "9"; }
    function isLetter(c) { return /[A-Za-zΑ-Ωα-ωℓء-ي]/.test(c); }
    while (i < n) {
      var c = str[i];
      if (c === " ") { i++; continue; }
      // X_L و C_eq: ما بعد الشرطة السفلية دليل سفلي للحرف السابق
      if (c === "_" && nodes.length && i + 1 < n && /[A-Za-z0-9]/.test(str[i + 1])) {
        var s2 = ""; i++; while (i < n && /[A-Za-z0-9]/.test(str[i])) { s2 += str[i]; i++; }
        nodes.push("<msub>" + nodes.pop() + "<mi>" + s2 + "</mi></msub>"); continue;
      }
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
      nodes.push("<mo>" + (c === "<" ? "&lt;" : c === "&" ? "&amp;" : c === ">" ? "&gt;" : c) + "</mo>"); i++;
    }
    return nodes.join("");
  }
  // يحوّل عقدة (نص أو جذر أو كسر أو غلاف) إلى MathML بشكل تعاودي
  function mmlFromNode(node) {
    if (node.nodeType === 3) return mmlFromText(node.textContent);
    if (node.nodeType !== 1) return "";
    var cl = node.classList;
    if (cl.contains("sqrt")) {
      var rad = node.querySelector(".rad");
      var inner = rad ? mmlFromNode(rad) : mmlFromText(node.textContent.replace(/[√∛]/, ""));
      var idx = node.getAttribute("data-n");
      // data-n="3" = جذر تكعيبي (∛) يُرسم <mroot> بدليل 3 فوق علامة الجذر
      return idx ? "<mroot><mrow>" + inner + "</mrow><mn>" + idx + "</mn></mroot>"
                 : "<msqrt><mrow>" + inner + "</mrow></msqrt>";
    }
    if (cl.contains("frac")) {
      var num = node.querySelector(".num"), den = node.querySelector(".den");
      return "<mfrac><mrow>" + (num ? mmlFromNode(num) : "") + "</mrow><mrow>" + (den ? mmlFromNode(den) : "") + "</mrow></mfrac>";
    }
    return Array.prototype.map.call(node.childNodes, mmlFromNode).join("");
  }
  // الاسم القديم محفوظ (تستدعيه صفحات كثيرة) لكنه الآن يحوّل الكسور أيضاً
  function upgradeSqrts(root) {
    (root || document).querySelectorAll(".sqrt, .frac").forEach(function (el) {
      if (!el.isConnected || (el.parentElement && el.parentElement.closest(".sqrt, .frac"))) return; // الخارجي فقط
      var holder = document.createElement("span");
      holder.innerHTML = "<math>" + mmlFromNode(el) + "</math>";
      el.replaceWith(holder.firstChild);
    });
  }
  /* MATH-TEXT:START — محوّل نصي خالص (بلا DOM): «√X» و«√(…)» و«∛X» و«a/b» ← ترميز .sqrt/.frac.
     نفس القواعد المجرَّبة بالفصل التمهيدي للسادس. نسخة مطابقة بمنصة المعلم:
     Teacher-Platform/demo/src/lib/mathText.js — عدّلهما معاً.
     لا يُحوَّل: الوحدات (m/s، A/s، N/m²، kg/m³، km/h)، الأسس 10^(n/2)، النص العربي،
     التواريخ (2026/10/05) والسنوات (2013/2014)، والروابط. */
  var MT_TERM = /[A-Za-z0-9.Α-Ωα-ωΔ_₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁻′'ₑ×πθ·ℓ]/;
  var MT_RTOKEN = /[0-9.A-Za-z₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹⁻×ℓ]/;
  // رموز الوحدات وأسماؤها المكتوبة بالموقع؛ «وحدة/وحدة» تبقى سطرية مثل الكتاب
  var MT_UNITS = /^(m|s|s²|A|V|J|kJ|W|kW|KW|KW\.h|kW\.h|K|T|N|C|F|H|Pa|g|Wb|MeV|kg\.m|kg·m|kg·m²|kg|rad|N·m²|C²|m²|m³|cm³|m²K⁴|nucleon|Hz|Ω|cm|km|min|line|lines|Dinar|Joule|joule|Col|Coulomb|coulomb|Coulomb²|volt|Volt|amper|Ampere|ampere|Second|second|Weber|weber|Lumen|Newton|newton|N.m²|meter|Meter|kV|u|cm²)$/;
  var MT_SQ_OPEN = "<span class='sqrt'", MT_END = "</span></span>";
  function mtIsUnit(w) { return MT_UNITS.test(w.replace(/^[0-9.⁰¹²³⁴⁵⁶⁷⁸⁹⁻×]+/, "")); }
  function mtEsc(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function mtRoots(s) {
    var out = "", i = 0;
    while (i < s.length) {
      var ch = s[i];
      if (ch !== "√" && ch !== "∛") { out += ch; i++; continue; }
      var j = i + 1, rad = null, k, depth;
      if (s[j] === "(") {
        for (depth = 0, k = j; k < s.length; k++) { if (s[k] === "(") depth++; else if (s[k] === ")" && --depth === 0) break; }
        if (k < s.length) { rad = s.slice(j + 1, k); j = k + 1; }
      } else {
        k = j; while (k < s.length && MT_RTOKEN.test(s[k])) k++;
        if (k > j) { rad = s.slice(j, k); j = k; }
      }
      if (rad === null || /[<>]/.test(rad)) { out += ch; i++; continue; }
      out += "<span class='sqrt'" + (ch === "∛" ? " data-n='3'" : "") + ">" + ch + "<span class='rad'>" + rad + "</span></span>";
      i = j;
    }
    return out;
  }
  function mtLeft(s, i) {
    var j = i, k, depth, a;
    while (j > 0 && s[j - 1] === " ") j--;
    if (s[j - 1] === ")") {
      for (depth = 0, k = j - 1; k >= 0; k--) { if (s[k] === ")") depth++; else if (s[k] === "(" && --depth === 0) break; }
      if (k < 0 || s[k - 1] === "^") return null;
      return [k, s.slice(k, j), true];
    }
    if (s.slice(0, j).slice(-MT_END.length) === MT_END) {
      a = s.lastIndexOf(MT_SQ_OPEN, j); while (a > 0 && MT_TERM.test(s[a - 1])) a--;
      return [a, s.slice(a, j), false];
    }
    k = j; while (k > 0 && MT_TERM.test(s[k - 1])) k--;
    // (ΔV)²/R: أس بعد قوس ← البسط هو المجموعة كلها مع أسّها
    if (k < j && s[k - 1] === ")" && /^[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+$/.test(s.slice(k, j))) {
      for (depth = 0, a = k - 1; a >= 0; a--) { if (s[a] === ")") depth++; else if (s[a] === "(" && --depth === 0) break; }
      if (a >= 0) return [a, s.slice(a, j), false];
    }
    return k === j ? null : [k, s.slice(k, j), false];
  }
  function mtRight(s, i) {
    var j = i, k, depth;
    while (s[j] === " ") j++;
    if (s[j] === "(") {
      for (depth = 0, k = j; k < s.length; k++) { if (s[k] === "(") depth++; else if (s[k] === ")" && --depth === 0) break; }
      return k >= s.length ? null : [k + 1, s.slice(j + 1, k), true];
    }
    if (s.substr(j, MT_SQ_OPEN.length) === MT_SQ_OPEN) {
      k = s.indexOf(MT_END, j) + MT_END.length; while (k < s.length && MT_TERM.test(s[k])) k++;
      return [k, s.slice(j, k), false];
    }
    k = j; while (k < s.length && MT_TERM.test(s[k])) k++;
    return k === j ? null : [k, s.slice(j, k), false];
  }
  function mtInCaret(s, i) {
    for (var d = 0, k = i - 1; k >= 0; k--) {
      if (s[k] === ")") d++;
      else if (s[k] === "(") { if (d === 0) return s[k - 1] === "^"; d--; }
    }
    return false;
  }
  function mtFracs(s) {
    var hits = [], i, L, R, ls, lt, re, rt, m;
    for (i = 0; i < s.length; i++) {
      if (s[i] !== "/" || s[i - 1] === "<" || s[i + 1] === ">") continue;
      L = mtLeft(s, i); R = mtRight(s, i + 1);
      if (!L || !R) continue;
      ls = L[0]; lt = L[1]; re = R[0]; rt = R[1];
      if (!R[2] && /\.$/.test(rt) && !/[0-9]/.test(s[re] || "")) { rt = rt.slice(0, -1); re--; }
      if (/.(json|js|html|pdf|png)$/.test(rt)) continue;                    // مسار ملف
      if (mtInCaret(s, i)) continue;                                        // 10^(n/2)
      if (s[ls - 1] === "/" || s[re] === "/") continue;                     // تواريخ وسلاسل a/b/c
      if (/^\d{4}$/.test(lt) && /^\d{4}$/.test(rt)) continue;              // سنتان: 2025/2026
      if (/^(19|20)\d\d$/.test(lt) || /^(19|20)\d\d$/.test(rt)) continue;  // الدور/السنة: 1/2019
      if (mtIsUnit(lt.trim()) && (mtIsUnit(rt.trim()) || (/^(km|kJ|kW|KW)$/.test(lt) && rt === "h"))) continue; // وحدات
      if (lt === "cm" && /^[0-9.]+$/.test(rt)) { m = s.slice(0, ls).match(/([0-9.]+) $/); if (m) { ls -= m[0].length; lt = m[0] + lt; } } // 1 cm / 2000
      hits.push([ls, re, L[2] ? lt.slice(1, -1) : lt, rt]);
    }
    var out = s, lastStart = Infinity, h;
    for (i = hits.length - 1; i >= 0; i--) {
      h = hits[i];
      if (h[1] > lastStart) continue;
      out = out.slice(0, h[0]) + "<span class='frac'><span class='num'>" + h[2] + "</span><span class='den'>" + h[3] + "</span></span>" + out.slice(h[1]);
      lastStart = h[0];
    }
    return out;
  }
  // نص خام ← HTML مُهرَّب فيه ترميز الجذور والكسور، أو null إن لم يتغيّر شيء
  function mathTextToMarkup(text) {
    if (!/[√∛\/]/.test(text) || /:\/\/|www\.|\.app\/|wa\.me/.test(text)) return null;
    var esc = mtEsc(text), out = mtFracs(mtRoots(esc));
    return out === esc ? null : out;
  }
  /* MATH-TEXT:END */

  // يحوّل النصوص العادية داخل root إلى جذور وكسور بشكل الكتاب (MathML)
  var MT_SKIP = "script,style,textarea,input,select,option,code,pre,math,svg,canvas,title,.no-math,.topbar,.crumbs,footer,.chip,.stars,.quiz-result";
  function mathify(root) {
    root = root || document.body;
    if (!root || root.nodeType !== 1 || (root.closest && root.closest(MT_SKIP))) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!/[√∛\/]/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        return (!p || p.closest(MT_SKIP) || p.closest(".sqrt, .frac")) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var list = [], n;
    while ((n = walker.nextNode())) list.push(n);
    list.forEach(function (t) {
      var html = mathTextToMarkup(t.nodeValue);
      if (html === null) return;
      var holder = document.createElement("span");
      holder.innerHTML = html;
      upgradeSqrts(holder);
      var frag = document.createDocumentFragment();
      while (holder.firstChild) frag.appendChild(holder.firstChild);
      t.parentNode.replaceChild(frag, t);
    });
    upgradeSqrts(root);
  }
  // المحتوى المبني لاحقاً بالجافاسكربت (المراجعة، الامتحانات، التوقعات، الأنشطة) يُحوَّل تلقائياً
  var mtObserver = null;
  function startMathObserver() {
    if (mtObserver || typeof MutationObserver === "undefined") return;
    var pending = [], scheduled = false;
    mtObserver = new MutationObserver(function (muts) {
      muts.forEach(function (m) { m.addedNodes.forEach(function (a) { if (a.nodeType === 1 || a.nodeType === 3) pending.push(a.nodeType === 1 ? a : a.parentElement); }); });
      if (scheduled) return;
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        var batch = pending; pending = [];
        mtObserver.disconnect();
        batch.forEach(function (el) { if (el && el.isConnected) mathify(el); });
        mtObserver.observe(document.body, { childList: true, subtree: true });
      }, 0);
    });
    mtObserver.observe(document.body, { childList: true, subtree: true });
  }
  document.addEventListener("DOMContentLoaded", function () { mathify(document.body); startMathObserver(); });

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
    // يشمل فصول الثالث متوسط (chN) والأول متوسط (g1cN) والخامس العلمي (g5cN)
    // والسادس العلمي (g6cN)، وصفحة أسئلة نهاية الفصل تُعامل معاملة الاختبار (exam).
    var m = (location.pathname || "").match(/\/(ch[0-9]+|g1c[0-9]+|g5c[0-9]+|g6c[0-9]+)\/(lesson[0-9]+|exam|questions)/i);
    if (!m) return { ch: null, node: null };
    var node = m[2].toLowerCase();
    return { ch: m[1].toLowerCase(), node: node === "questions" ? "exam" : node };
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
      // الاختبار قد يُبنى بعد DOMContentLoaded (صفحات النشاط المنزلي) فنحوّل جذوره هنا
      upgradeSqrts(div);
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
    quiz: quiz, confetti: confetti, upgradeSqrts: upgradeSqrts, mathify: mathify,
    getAttempts: getAttempts, clearAttempts: clearAttempts,
    recordAttempt: recordAttempt, inferSkill: inferSkill,
    pageContext: pageContext, pageTopic: pageTopic
  };
})();
