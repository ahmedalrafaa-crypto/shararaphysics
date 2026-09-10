/* ============================================================
   محرك النشاط المنزلي المشترك
   ------------------------------------------------------------
   كل صفحة نشاط تعرّف الكائن ACTIVITY قبل تحميل هذا الملف:

     var ACTIVITY = {
       ch: "g6c1", lesson: "1",
       title: "الموصل الكروي المنفرد المعزول",
       questions: [ { q, opts, a, why }, ... ]
     };

   وهذا الملف يبني الصفحة كاملة: كلمة السر ← الاسم ← الأسئلة ← إرسال النتيجة.
   كلمة السر ورابط السيرفر هنا فقط، فتغييرهما يصير بمكان واحد لا بكل درس.
   ============================================================ */
var ShararahActivity = (function () {
  "use strict";

  // ⚠️ كلمة سر الطلاب — غيّرها هنا فقط، وتتغيّر بكل الأنشطة دفعة واحدة.
  //    (لازم تطابق CLASS_PASSWORD المكتوبة بصفحة activities.html لتوليد الروابط)
  var CLASS_PASSWORD = "sharara26";

  // نفس رابط الـ Web App المستخدم بباقي الموقع (admin.html وتسجيل الزيارات).
  var API_URL = "https://script.google.com/macros/s/AKfycbw8veop0lgoNiMdaJiiESAG6vvna7ey-3npPECaxt1d5pMhmnl1Pu__JdHlQeGyHa0TXQ/exec";

  // أقصى عدد أسئلة بالنشاط الواحد — الدروس اللي أسئلتها أكثر نأخذ منها أول 5.
  var MAX_QUESTIONS = 5;

  // توحيد شكل المدخلات قبل المقارنة: الأرقام العربية (٢٠٢٦) والإنكليزية (2026) تُعامَل
  // بنفس الطريقة، وتُتجاهل المسافات وحالة الأحرف — لأن لوحة مفاتيح كل طالب تكتب
  // الأرقام بشكل مختلف، وبدون هذا التوحيد تفشل كلمة السر بلا سبب واضح للطالب.
  function normalize(s) {
    return (s || "")
      .replace(/[٠-٩]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48); })
      .replace(/[۰-۹]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48); })
      .replace(/\s+/g, "")
      .toLowerCase();
  }

  // نداء JSONP عبر وسم <script> — نفس أسلوب admin.html، لأن fetch المباشر يُحظر بـ CORS.
  function callApi(params, onDone) {
    var cbName = "shararahActCb" + Date.now() + Math.floor(Math.random() * 1000);
    var script = document.createElement("script");
    var done = false;
    var timer = setTimeout(function () { finish(null, true); }, 12000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    function finish(data, isTimeoutOrError) {
      if (done) return;
      done = true;
      cleanup();
      onDone(isTimeoutOrError ? { result: "network_error" } : data);
    }

    window[cbName] = function (data) { finish(data, false); };
    script.onerror = function () { finish(null, true); };

    var qs = "callback=" + cbName;
    for (var key in params) qs += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
    script.src = API_URL + "?" + qs;
    document.body.appendChild(script);
  }

  function el(id) { return document.getElementById(id); }

  function buildMarkup(cfg) {
    var title = cfg.title || "نشاط منزلي";
    return '' +
      '<div class="topbar">' +
        '<a class="brand" href="../../index.html"><img class="brand-logo" src="../../assets/logo-ar.png" alt="شعار أ. أحمد رافع"> فيزياء أ. أحمد رافع</a>' +
        '<span class="crumbs">/ نشاط منزلي</span>' +
      '</div>' +

      '<div id="actPinScreen">' +
        '<div class="hero">' +
          '<h1>🔒 نشاط منزلي: ' + title + '</h1>' +
          '<p>هذا النشاط خاص بطلاب الأستاذ أحمد رافع — اطلب كلمة السر من أستاذك.</p>' +
        '</div>' +
        '<div class="card">' +
          '<div class="admin-field">' +
            '<label>كلمة السر</label>' +
            '<div style="display:flex;gap:8px;align-items:stretch">' +
              '<input type="password" id="actPin" placeholder="••••••" autocomplete="off" style="flex:1;min-width:0">' +
              '<button type="button" class="btn ghost" id="actPinToggle" style="flex:0 0 auto;padding:0 14px;white-space:nowrap">👁 إظهار</button>' +
            '</div>' +
          '</div>' +
          '<p class="admin-msg error" id="actPinMsg"></p>' +
          '<button type="button" class="btn" id="actPinSubmit" style="width:100%;margin-top:10px">دخول</button>' +
        '</div>' +
      '</div>' +

      '<div id="actNameScreen" style="display:none">' +
        '<div class="hero">' +
          '<h1>🏠 نشاط منزلي: ' + title + '</h1>' +
          '<p>أسئلة سريعة لتثبيت الدرس وأنت بالبيت. اكتب اسمك وجاوب بهدوء — تظهر لك النتيجة فوراً بعد كل سؤال.</p>' +
        '</div>' +
        '<div class="card">' +
          '<div class="admin-field">' +
            '<label>الاسم الكامل</label>' +
            '<input type="text" id="actName" placeholder="مثلاً: أحمد محمد" autocomplete="off">' +
          '</div>' +
          '<p class="admin-msg error" id="actNameMsg"></p>' +
          '<button type="button" class="btn" id="actStart" style="width:100%;margin-top:10px">🚀 ابدأ النشاط</button>' +
        '</div>' +
      '</div>' +

      '<div id="actQuizScreen" style="display:none">' +
        '<div class="hero"><h1>🏠 نشاط منزلي: ' + title + '</h1></div>' +
        '<div id="actQuiz"></div>' +
        '<div id="actSendStatus" class="notebox" style="display:none;margin-top:16px"></div>' +
      '</div>';
    // الفوتر يبقى ثابتاً بالصفحة نفسها (خارج activityRoot) حتى يلقاه core.js
    // عند DOMContentLoaded فيحقن صندوق "بلّغ عن خطأ" بمكانه الصحيح.
  }

  function start(cfg) {
    if (!cfg || !cfg.questions || !cfg.questions.length) return;

    var host = document.getElementById("activityRoot");
    if (!host) return;
    host.innerHTML = buildMarkup(cfg);

    var questions = cfg.questions.slice(0, MAX_QUESTIONS);
    var studentName = "";
    // وضع معاينة (زر "👁 معاينة" بصفحة activities.html فقط): يتخطى شاشة الاسم
    // تماماً ويورّي الأسئلة مباشرة، وما يرسل أي نتيجة — للأستاذ يراجع المحتوى بلا
    // ما يضطر يكتب اسم وهمي أو يلوّث جدول الدرجات بمحاولة مو حقيقية.
    var isPreview = /[?&]preview=1(&|$)/.test(location.search || "");

    function showNameScreen() {
      el("actPinScreen").style.display = "none";
      el("actNameScreen").style.display = "block";
    }

    function runQuiz() {
      el("actPinScreen").style.display = "none";
      el("actNameScreen").style.display = "none";
      el("actQuizScreen").style.display = "block";

      if (isPreview) {
        var badge = document.createElement("div");
        badge.className = "notebox";
        badge.style.marginBottom = "16px";
        badge.textContent = "🔍 وضع معاينة — هذا العرض للمراجعة فقط، ما راح تُرسل أي نتيجة.";
        el("actQuiz").parentNode.insertBefore(badge, el("actQuiz"));
      }

      Phy.quiz("actQuiz", questions, {
        ch: cfg.ch,
        onDone: function (stars, score, total) {
          if (isPreview) return; // معاينة فقط — لا تسجيل تقدّم ولا إرسال نتيجة
          Phy.setLesson(cfg.ch, cfg.lesson, { stars: stars });
          var statusEl = el("actSendStatus");
          statusEl.style.display = "block";
          statusEl.textContent = "⏳ جارٍ إرسال نتيجتك للأستاذ...";
          callApi({
            action: "logActivity",
            studentName: studentName,
            ch: cfg.ch,
            lesson: cfg.lesson,
            score: score,
            total: total
          }, function (data) {
            if (data && data.result === "success") {
              statusEl.textContent = "✅ تم إرسال نتيجتك للأستاذ أحمد";
            } else if (data && data.result === "busy") {
              statusEl.textContent = "⏳ السيرفر مشغول لحظة — أعد تحميل الصفحة وسلّم مرة أخرى";
            } else {
              statusEl.textContent = "⚠️ تعذّر إرسال النتيجة، تأكد من اتصالك بالإنترنت وحاول تسليم الصفحة مرة أخرى";
            }
          });
        }
      });
    }

    function tryEnter() {
      if (normalize(el("actPin").value) !== normalize(CLASS_PASSWORD)) {
        el("actPinMsg").textContent = "كلمة السر غير صحيحة";
        return;
      }
      showNameScreen();
    }

    el("actPinSubmit").addEventListener("click", tryEnter);
    el("actPin").addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryEnter();
    });
    el("actPinToggle").addEventListener("click", function () {
      var input = el("actPin");
      var showing = input.type === "text";
      input.type = showing ? "password" : "text";
      this.textContent = showing ? "👁 إظهار" : "🙈 إخفاء";
      input.focus();
    });

    el("actName").addEventListener("keydown", function (e) {
      if (e.key === "Enter") el("actStart").click();
    });

    el("actStart").addEventListener("click", function () {
      var name = (el("actName").value || "").trim();
      if (!name) { el("actNameMsg").textContent = "اكتب اسمك أولاً"; return; }
      studentName = name;
      runQuiz();
    });

    // لو فتح الطالب رابطاً يحمل كلمة السر (?p=...) نتجاوز شاشة كلمة السر مباشرة،
    // فيكفيه ضغطة واحدة على الرابط المرسل بالواتساب. ومن يفتح الصفحة بلا هذا
    // الرابط (مثلاً من داخل الدرس) تبقى شاشة كلمة السر تطالبه بها كالمعتاد.
    // ولو كان رابط معاينة (preview=1) نتخطى شاشة الاسم أيضاً وندخل الأسئلة مباشرة.
    var m = (location.search || "").match(/[?&]p=([^&]*)/);
    if (m) {
      var given = decodeURIComponent((m[1] || "").replace(/\+/g, " "));
      if (normalize(given) === normalize(CLASS_PASSWORD)) {
        if (isPreview) runQuiz();
        else showNameScreen();
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (window.ACTIVITY) start(window.ACTIVITY);
  });

  return { start: start, password: function () { return CLASS_PASSWORD; } };
})();
