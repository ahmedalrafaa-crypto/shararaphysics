/* ============================================================
   نظام التفعيل: يقفل صفحات معيّنة خلف كود تفعيل يتحقق منه
   Google Apps Script Web App، ويحفظ حالة الفتح بـ localStorage.
   ============================================================ */
var ShararahAccess = (function () {
  "use strict";

  // ⚠️ الصق هنا رابط الـ Web app الخاص بـ Google Apps Script بعد نشره
  var ACCESS_CONTROL_URL = "https://script.google.com/macros/s/AKfycbw8veop0lgoNiMdaJiiESAG6vvna7ey-3npPECaxt1d5pMhmnl1Pu__JdHlQeGyHa0TXQ/exec";

  var TOKEN_KEY = "shararah_device_token";
  var UNLOCK_KEY = "shararah_unlocked";
  var EXPIRY_KEY = "shararah_expires_at";
  var LAST_CHECK_KEY = "shararah_last_check";
  // مرحلة الاشتراك: "g3" الثالث متوسط · "g6" السادس العلمي · "all" المرحلتان.
  var STAGE_KEY = "shararah_stage";
  // فترة سماح للأكواد المُفعّلة قبل نظام الاشتراكات (بلا تاريخ انتهاء مخزَّن محلياً).
  // يجب أن تطابق LEGACY_EXPIRY في Google Apps Script تماماً.
  var LEGACY_EXPIRY_ISO = "2027-08-08T00:00:00Z";
  // كل كم مدة نتأكد مع السيرفر إن الجهاز لسا مصرّح له فعلاً، بدل الثقة الدائمة بالتخزين المحلي وحده.
  var REVALIDATE_INTERVAL_MS = 20 * 60 * 60 * 1000;

  if (ACCESS_CONTROL_URL.indexOf("PASTE_") === 0) {
    console.warn("[access-control] رابط Google Apps Script غير مضبوط بعد — عدّل ACCESS_CONTROL_URL في js/access-control.js");
  }

  // نحسب مسار جذر الموقع اعتماداً على مسار هذا السكربت نفسه،
  // لأنه يُستدعى بعمق مختلف حسب الصفحة (../js أو ../../js)
  var ACCESS_SCRIPT_EL = (function () {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if ((scripts[i].getAttribute("src") || "").indexOf("access-control.js") !== -1) return scripts[i];
    }
    return null;
  })();
  var SITE_ROOT = (function () {
    var src = ACCESS_SCRIPT_EL && ACCESS_SCRIPT_EL.getAttribute("src");
    return src ? src.replace(/js\/access-control\.js(?:\?.*)?$/, "") : "./";
  })();
  // صفحات مثل الرئيسية وخريطة فصول السادس تعرض دروساً مجانية ومدفوعة معاً:
  // نكتفي فيها بتظليل العناصر [data-req-stage] المقفلة، بلا قفل الصفحة كلها بستارة.
  var BADGES_ONLY = !!(ACCESS_SCRIPT_EL && ACCESS_SCRIPT_EL.hasAttribute("data-badges-only"));
  var HOME_URL = SITE_ROOT + "index.html";
  var SUBSCRIBE_URL = SITE_ROOT + "subscribe.html";

  function generateUUID() {
    if (window.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getDeviceToken() {
    var token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      token = generateUUID();
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  }

  // ---- فصل الوصول حسب المرحلة (تسعير منفصل للثالث متوسط والسادس العلمي) ----

  // أي مرحلة تحتاجها هذه الصفحة؟ null = أداة مشتركة يكفيها أي اشتراك فعّال.
  // فصول الخامس العلمي (g5cN) مجانية أصلاً ولا تُحمّل هذا الملف إطلاقاً.
  function requiredStage() {
    var p = (location.pathname || "").toLowerCase();
    if (/\/g6c\d+\//.test(p) || p.indexOf("/predictions-g6/") !== -1 || p.indexOf("/weird-questions/") !== -1) return "g6";
    if (/\/ch\d+\//.test(p) || p.indexOf("/predictions/") !== -1) return "g3";
    return null;
  }

  // يفشل مفتوحاً عمداً: الكود القديم (عموده فارغ) والسيرفر اللي لسا ما نُشرت عليه
  // نسخة المراحل كلاهما يعطي stage فاضية — فلا نقفل طالباً دافعاً بسبب تأخّر نشر.
  function stageAllows(stage, needed) {
    if (!needed) return true;
    if (!stage || stage === "all") return true;
    return stage === needed;
  }

  function stageName(s) {
    if (s === "g6") return "السادس العلمي";
    if (s === "g3") return "الثالث المتوسط";
    return "المرحلتين";
  }

  function currentStage() {
    return localStorage.getItem(STAGE_KEY);
  }

  function stageMismatchText() {
    return "اشتراكك يغطي " + stageName(currentStage()) +
      "، وهذا المحتوى يخص " + stageName(requiredStage()) +
      ". تواصل مع الأستاذ أحمد لترقية اشتراكك.";
  }

  function clearSubscription() {
    localStorage.removeItem(UNLOCK_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(LAST_CHECK_KEY);
    localStorage.removeItem(STAGE_KEY);
  }

  function subscriptionActive() {
    if (localStorage.getItem(UNLOCK_KEY) !== "true") return false;
    var expiresAt = localStorage.getItem(EXPIRY_KEY);
    return Date.now() < Date.parse(expiresAt || LEGACY_EXPIRY_ISO);
  }

  function isUnlocked() {
    if (!subscriptionActive()) return false;
    return stageAllows(currentStage(), requiredStage());
  }

  // يميّز "أول مرة" عن "انتهت المدة" عن "مرحلة أخرى" عشان تظهر رسالة القفل المناسبة.
  function lockReason() {
    if (localStorage.getItem(UNLOCK_KEY) !== "true") return "locked";
    if (!subscriptionActive()) return "expired";
    if (!stageAllows(currentStage(), requiredStage())) return "stage";
    return "locked";
  }

  // يظلّل أي عنصر عليه data-req-stage="g3|g6" ويضيف رمز 🔒 عليه لو مرحلته
  // غير مفعّلة بعد، بلا ما يمس باقي الصفحة — تُستخدم بصفحات القوائم المختلطة
  // (الرئيسية، خريطة فصول السادس) حيث تظهر دروس مجانية ومدفوعة بنفس القائمة.
  function decorateLockBadges() {
    var nodes = document.querySelectorAll("[data-req-stage]");
    for (var i = 0; i < nodes.length; i++) {
      var stage = nodes[i].getAttribute("data-req-stage");
      var covered = subscriptionActive() && stageAllows(currentStage(), stage);
      nodes[i].classList.toggle("needs-code", !covered);
    }
  }

  var overlay = null, els = {};
  var unlockCallbacks = [];

  // تسجيل دالة تُستدعى فوراً لو الطالب مفعّل أصلاً، أو تُؤجَّل لحين نجاح التفعيل.
  // تستخدمها صفحات المراجعة والبحث لتأجيل تحميل بيانات الدروس الكاملة (js/lessons-data*.js)
  // لحد ما يثبت التفعيل فعلاً، بدل تحميلها كملف عام يقرأه أي زائر بلا كود.
  function onUnlock(cb) {
    if (typeof cb !== "function") return;
    if (isUnlocked()) { cb(); return; }
    unlockCallbacks.push(cb);
  }

  function fireUnlockCallbacks() {
    var cbs = unlockCallbacks;
    unlockCallbacks = [];
    cbs.forEach(function (cb) { cb(); });
  }

  function injectStyles() {
    if (document.getElementById("shararah-access-style")) return;
    var style = document.createElement("style");
    style.id = "shararah-access-style";
    style.textContent =
      "#shararah-access-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;" +
      "padding:20px;background:rgba(11,18,32,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);" +
      "font-family:'Cairo','Tajawal',sans-serif;opacity:0;animation:sc-fade-in .25s ease forwards}" +
      "#shararah-access-overlay.sc-hide{animation:sc-fade-out .25s ease forwards}" +
      "@keyframes sc-fade-in{from{opacity:0}to{opacity:1}}" +
      "@keyframes sc-fade-out{from{opacity:1}to{opacity:0}}" +
      ".sc-modal{width:min(92vw,400px);background:#0B1220;border:1px solid rgba(76,201,240,.25);" +
      "border-radius:20px;padding:36px 28px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);" +
      "transform:scale(.94);animation:sc-pop .25s ease forwards}" +
      "@keyframes sc-pop{to{transform:scale(1)}}" +
      ".sc-icon{font-size:2.4rem;line-height:1;margin-bottom:10px}" +
      ".sc-modal h2{color:#F5F7FA;font-size:1.3rem;font-weight:800;margin:0 0 8px}" +
      ".sc-sub{color:rgba(245,247,250,.62);font-size:.9rem;font-weight:600;margin:0 0 20px;line-height:1.6}" +
      ".sc-input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);" +
      "border:1.5px solid rgba(76,201,240,.35);border-radius:12px;padding:13px 14px;color:#F5F7FA;" +
      "font-family:inherit;font-size:1rem;font-weight:700;text-align:center;outline:none;" +
      "transition:border-color .2s,box-shadow .2s}" +
      ".sc-input:focus{border-color:#4CC9F0;box-shadow:0 0 0 3px rgba(76,201,240,.18)}" +
      ".sc-input::placeholder{color:rgba(245,247,250,.35);font-weight:600}" +
      ".sc-btn{width:100%;margin-top:12px;background:#4CC9F0;color:#0B1220;border:none;border-radius:12px;" +
      "padding:13px 20px;font-family:inherit;font-size:1rem;font-weight:800;cursor:pointer;" +
      "transition:filter .2s,transform .2s}" +
      ".sc-btn:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px)}" +
      ".sc-btn:disabled{opacity:.55;cursor:not-allowed}" +
      ".sc-msg{min-height:18px;margin:14px 0 0;font-size:.85rem;font-weight:700;line-height:1.6}" +
      ".sc-msg-error{color:#FF6B6B}" +
      ".sc-msg-success{color:#4ADE80}" +
      ".sc-msg-warning{color:#ffc93c}" +
      ".sc-divider{height:1px;background:rgba(245,247,250,.12);margin:22px 0 16px}" +
      ".sc-help{color:rgba(245,247,250,.55);font-size:.82rem;font-weight:600;margin:0 0 12px;line-height:1.6}" +
      ".sc-btn-outline{display:block;width:100%;box-sizing:border-box;background:transparent;color:#4CC9F0;" +
      "border:1.5px solid rgba(76,201,240,.5);border-radius:12px;padding:11px 16px;font-family:inherit;" +
      "font-size:.92rem;font-weight:700;cursor:pointer;text-decoration:none;transition:background .2s,transform .2s}" +
      ".sc-btn-outline:hover{background:rgba(76,201,240,.1);transform:translateY(-1px)}" +
      ".sc-btn-ghost{display:block;width:100%;box-sizing:border-box;margin-top:14px;background:transparent;" +
      "border:none;color:rgba(245,247,250,.5);font-family:inherit;font-size:.85rem;font-weight:700;" +
      "cursor:pointer;padding:6px;text-decoration:underline;text-underline-offset:3px;transition:color .2s}" +
      ".sc-btn-ghost:hover{color:rgba(245,247,250,.85)}";
    document.head.appendChild(style);
  }

  function setBackgroundInert(flag) {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el === overlay) return;
      if (flag) el.setAttribute("inert", ""); else el.removeAttribute("inert");
    });
  }

  function setMessage(text, kind) {
    els.msg.textContent = text || "";
    els.msg.className = "sc-msg" + (kind ? " sc-msg-" + kind : "");
  }

  function setLoading(loading) {
    els.btn.disabled = loading;
    els.input.disabled = loading;
    els.btn.textContent = loading ? "جارٍ التحقق..." : "تفعيل ⚡";
  }

  function applyResult(data) {
    if (data && data.result === "success") {
      localStorage.setItem(UNLOCK_KEY, "true");
      localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
      if (data.expiresAt) localStorage.setItem(EXPIRY_KEY, data.expiresAt);
      else localStorage.removeItem(EXPIRY_KEY);
      if (data.stage) localStorage.setItem(STAGE_KEY, data.stage);
      else localStorage.removeItem(STAGE_KEY);

      // الكود صحيح وفعّال، لكنه لمرحلة ثانية: نُبقيه محفوظاً (فصوله تفتح عنده)
      // ونكتفي بشرح سبب بقاء هذه الصفحة مقفلة.
      if (!stageAllows(currentStage(), requiredStage())) {
        setMessage(stageMismatchText(), "warning");
        return;
      }
      setMessage("تم التفعيل بنجاح ✅", "success");
      fireUnlockCallbacks();
      setTimeout(unlockContent, 600);
    } else if (data && data.result === "expired") {
      clearSubscription();
      setMessage("انتهت مدة اشتراكك، تواصل مع الأستاذ أحمد للتجديد", "warning");
    } else if (data && data.result === "used_elsewhere") {
      setMessage("هذا الكود مُفعّل على جهاز آخر، تواصل مع الأستاذ أحمد لنقله", "error");
    } else if (data && data.result === "invalid") {
      setMessage("الكود غير صحيح، تأكد من كتابته بشكل صحيح", "error");
    } else {
      setMessage("حدث خطأ غير متوقع، حاول مرة أخرى", "error");
    }
  }

  function handleSubmit() {
    var code = (els.input.value || "").trim();
    if (!code) { setMessage("الرجاء إدخال كود التفعيل", "error"); return; }

    setLoading(true);
    setMessage("", "");

    // JSONP عبر وسم <script>: طلبات Apps Script من نوع fetch تنحظر بـ CORS
    // بسبب تحويل داخلي بلا ترويسة CORS، بينما تحميل <script> لا يخضع لقيود CORS إطلاقاً.
    var cbName = "shararahAccessCb" + Date.now();
    var script = document.createElement("script");
    var done = false;

    var timer = setTimeout(function () { finish(null, true); }, 10000);

    function cleanup() {
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    function finish(data, isTimeoutOrError) {
      if (done) return;
      done = true;
      cleanup();
      setLoading(false);
      if (isTimeoutOrError) setMessage("تعذّر الاتصال بالخادم، تحقق من اتصال الإنترنت وحاول مجدداً", "error");
      else applyResult(data);
    }

    window[cbName] = function (data) { finish(data, false); };
    script.onerror = function () { finish(null, true); };
    script.src = ACCESS_CONTROL_URL + "?code=" + encodeURIComponent(code) +
      "&deviceToken=" + encodeURIComponent(getDeviceToken()) + "&callback=" + cbName;
    document.body.appendChild(script);
  }

  function goToFreeChapters() {
    window.location.href = HOME_URL;
  }

  function onOverlayKeyDown(e) {
    if (e.key === "Escape") goToFreeChapters();
  }

  function buildModal(reason) {
    injectStyles();
    overlay = document.createElement("div");
    overlay.id = "shararah-access-overlay";
    overlay.innerHTML =
      '<div class="sc-modal" role="dialog" aria-modal="true" aria-labelledby="sc-title">' +
        '<div class="sc-icon">' + (reason === "stage" ? "🎓" : "🔒") + "</div>" +
        '<h2 id="sc-title">' + (reason === "stage" ? "هذا المحتوى لمرحلة ثانية" : "هذا المحتوى مقفل") + "</h2>" +
        '<p class="sc-sub">' + (reason === "stage"
          ? "اشتراكك الحالي ما يشمل " + stageName(requiredStage()) + " — أدخل كود هذه المرحلة لو عندك واحد"
          : "أدخل كود التفعيل لفتح هذا الفصل") + "</p>" +
        '<input type="text" class="sc-input" id="sc-code-input" placeholder="اكتب كود التفعيل هنا" autocomplete="off">' +
        '<button type="button" class="sc-btn" id="sc-submit-btn">تفعيل ⚡</button>' +
        '<p class="sc-msg" id="sc-msg"></p>' +
        '<div class="sc-divider"></div>' +
        '<p class="sc-help">ليس لديك كود تفعيل؟</p>' +
        '<a class="sc-btn-outline" id="sc-request-link" href="' + SUBSCRIBE_URL + '" target="_blank" rel="noopener noreferrer">💳 شوف خطط الاشتراك</a>' +
        '<button type="button" class="sc-btn-ghost" id="sc-cancel-btn">إلغاء والرجوع للفصول المجانية</button>' +
      "</div>";
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    setBackgroundInert(true);

    els = {
      input: overlay.querySelector("#sc-code-input"),
      btn: overlay.querySelector("#sc-submit-btn"),
      msg: overlay.querySelector("#sc-msg"),
      cancelBtn: overlay.querySelector("#sc-cancel-btn")
    };
    els.btn.addEventListener("click", handleSubmit);
    els.input.addEventListener("keydown", function (e) { if (e.key === "Enter") handleSubmit(); });
    els.cancelBtn.addEventListener("click", goToFreeChapters);
    document.addEventListener("keydown", onOverlayKeyDown);
    els.input.focus();

    if (reason === "expired") {
      setMessage("انتهت مدة اشتراكك، أدخل كوداً جديداً أو تواصل مع الأستاذ أحمد للتجديد", "warning");
    } else if (reason === "stage") {
      setMessage(stageMismatchText(), "warning");
    }
  }

  function showLockModal(reason) {
    if (!overlay) buildModal(reason);
  }

  function unlockContent() {
    if (!overlay) return;
    document.removeEventListener("keydown", onOverlayKeyDown);
    setBackgroundInert(false);
    document.body.style.overflow = "";
    overlay.classList.add("sc-hide");
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
    }, 250);
  }

  // تحقق دوري صامت مع السيرفر: يمنع بقاء حالة "مفعّل" صالحة للأبد لمجرد وجودها
  // بالتخزين المحلي (سواء نُسخت من جهاز ثاني أو عُدّلت يدوياً)، بلا ربط حقيقي بالسيرفر.
  // يفشل بأمان: أي خطأ اتصال لا يقفل الطالب، فقط يُعاد المحاولة بالمرة الجاية.
  function maybeRevalidate() {
    var last = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
    if (Date.now() - last < REVALIDATE_INTERVAL_MS) return;

    var cbName = "shararahRevalidateCb" + Date.now();
    var script = document.createElement("script");
    var done = false;
    var timer = setTimeout(cleanup, 10000);

    function cleanup() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      delete window[cbName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cbName] = function (data) {
      cleanup();
      if (data && data.result === "success") {
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        if (data.expiresAt) localStorage.setItem(EXPIRY_KEY, data.expiresAt);
        // نحدّث المرحلة فقط لو أرسلها السيرفر — غيابها يعني نسخة سكربت قديمة، فنُبقي المخزَّن.
        if (data.stage) localStorage.setItem(STAGE_KEY, data.stage);
        if (!stageAllows(currentStage(), requiredStage()) && !overlay) showLockModal("stage");
        return;
      }
      // "invalid" غير مشمولة عمداً: هذا الرد اللي يرجعه السيرفر القديم (قبل نشر checkStatus)
      // لأي طلب ما يفهمه، فلا نقفل طلاب حقيقيين لمجرد إن نسخة Apps Script لسا ما تحدّثت.
      if (data && (data.result === "expired" || data.result === "not_found")) {
        clearSubscription();
        if (!overlay) showLockModal(data.result === "expired" ? "expired" : "locked");
      }
    };
    script.onerror = cleanup;
    script.src = ACCESS_CONTROL_URL + "?action=checkStatus&deviceToken=" +
      encodeURIComponent(getDeviceToken()) + "&callback=" + cbName;
    document.body.appendChild(script);
  }

  function run() {
    getDeviceToken();
    decorateLockBadges();
    if (BADGES_ONLY) return;
    if (isUnlocked()) {
      maybeRevalidate();
      return;
    }
    var reason = lockReason();
    // اشتراك المرحلة الثانية سليم وفعّال — لا نمسحه، وإلا انقفلت فصوله هو كمان.
    if (reason !== "stage") clearSubscription();
    showLockModal(reason);
  }
  if (document.body) run();
  else document.addEventListener("DOMContentLoaded", run);

  // عند الرجوع لصفحة محفوظة بذاكرة المتصفح (bfcache) بعد تفعيل الكود بصفحة
  // ثانية، لا تُعاد سكربتات الصفحة — فنُحدّث الشارات يدوياً لتختفي فوراً.
  window.addEventListener("pageshow", decorateLockBadges);

  return {
    isUnlocked: isUnlocked,
    onUnlock: onUnlock,
    stage: currentStage,
    reset: clearSubscription
  };
})();
