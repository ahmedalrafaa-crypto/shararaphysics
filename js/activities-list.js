/* ============================================================
   قائمة الأنشطة المنزلية (مصدر واحد)
   ------------------------------------------------------------
   تقرأها صفحتان: activities.html (روابط الأستاذ) و homework.html
   (فهرس الواجبات للطلاب). عند إضافة نشاط جديد لدرس، أضف سطراً هنا فقط.
   ============================================================ */
var SHARARA_ACTIVITIES = [
  { chapterName: "══ الثالث المتوسط ══" },
  { chapterName: "الفصل الثالث: التيار الكهربائي" },
  { ch: "ch3", lesson: "1", title: "حركة الشحنات الكهربائية" },
  { ch: "ch3", lesson: "2", title: "التيار الكهربائي والأمبير" },
  { ch: "ch3", lesson: "3", title: "أنواع التيار الكهربائي" },
  { ch: "ch3", lesson: "4", title: "الدائرة الكهربائية وقياس التيار" },
  { ch: "ch3", lesson: "5", title: "فرق الجهد الكهربائي" },
  { ch: "ch3", lesson: "6", title: "المقاومة الكهربائية وقانون أوم" },
  { ch: "ch3", lesson: "7", title: "طرائق ربط المقاومات الكهربائية" },
  { ch: "ch3", lesson: "8", title: "ربط المصابيح والخلايا والدائرة القصيرة" },
  { chapterName: "الفصل الرابع: البطارية والقوة الدافعة الكهربائية" },
  { ch: "ch4", lesson: "1", title: "ما البطارية؟ وكيف تصنع؟" },
  { ch: "ch4", lesson: "2", title: "تصنيف البطاريات وخلية دانيال" },
  { ch: "ch4", lesson: "3", title: "الخلية الجافة (كاربون – خارصين)" },
  { ch: "ch4", lesson: "4", title: "البطارية الثانوية وبطارية السيارة" },
  { ch: "ch4", lesson: "5", title: "بطارية أيون الليثيوم" },
  { ch: "ch4", lesson: "6", title: "بطارية الوقود" },
  { ch: "ch4", lesson: "7", title: "القوة الدافعة الكهربائية والمقاومة الداخلية" },
  { chapterName: "الفصل الخامس: الطاقة والقدرة الكهربائية" },
  { ch: "ch5", lesson: "1", title: "القدرة الكهربائية ووحداتها" },
  { ch: "ch5", lesson: "2", title: "قوانين القدرة الثلاثة والنشاط الوزاري" },
  { ch: "ch5", lesson: "3", title: "مسائل القدرة الكهربائية" },
  { ch: "ch5", lesson: "4", title: "قدرة الأجهزة المنزلية وتوهج المصابيح" },
  { ch: "ch5", lesson: "5", title: "الطاقة الكهربائية E = P × t" },
  { ch: "ch5", lesson: "6", title: "كلفة الطاقة الكهربائية" },
  { ch: "ch5", lesson: "7", title: "الكهرباء في بيوتنا" },
  { ch: "ch5", lesson: "8", title: "التأريض وتجنب الصعقة الكهربائية" },
  { chapterName: "الفصل السادس: الكهربائية والمغناطيسية" },
  { ch: "ch6", lesson: "1", title: "تجربة أورستد" },
  { ch: "ch6", lesson: "2", title: "المجال المغناطيسي لسلك مستقيم" },
  { ch: "ch6", lesson: "3", title: "مجال الحلقة الدائرية والملف المحلزن" },
  { ch: "ch6", lesson: "4", title: "المغناطيس الكهربائي" },
  { ch: "ch6", lesson: "5", title: "الجرس والهاتف والمرحل" },
  { ch: "ch6", lesson: "6", title: "الحث الكهرومغناطيسي والتيار المحتث" },
  { ch: "ch6", lesson: "7", title: "المولد الكهربائي المتناوب والمستمر" },
  { ch: "ch6", lesson: "8", title: "المحرك الكهربائي" },
  { chapterName: "الفصل السابع: المحولة الكهربائية" },
  { ch: "ch7", lesson: "1", title: "التيار المحتث والمحولة الكهربائية" },
  { ch: "ch7", lesson: "2", title: "مبدأ عمل المحولة (الحث المتبادل)" },
  { ch: "ch7", lesson: "3", title: "لماذا التيار المتناوب؟" },
  { ch: "ch7", lesson: "4", title: "قانون المحولة ونسبة التحويل" },
  { ch: "ch7", lesson: "5", title: "علاقة القدرة والتيار" },
  { ch: "ch7", lesson: "6", title: "كفاءة المحولة" },
  { ch: "ch7", lesson: "7", title: "خسائر القدرة في المحولة" },
  { ch: "ch7", lesson: "8", title: "نقل الطاقة والاستعمالات" },
  { chapterName: "الفصل الثامن: تكنولوجيا مصادر الطاقة" },
  { ch: "ch8", lesson: "1", title: "الطاقة في حياتنا ومصادرها الحالية" },
  { ch: "ch8", lesson: "2", title: "الطاقة الأحفورية" },
  { ch: "ch8", lesson: "3", title: "الطاقة المائية" },
  { ch: "ch8", lesson: "4", title: "الطاقة النووية" },
  { ch: "ch8", lesson: "5", title: "الطاقة المتجددة (البديلة)" },
  { ch: "ch8", lesson: "6", title: "الطاقة الشمسية" },
  { ch: "ch8", lesson: "7", title: "طاقة الرياح والوقود الحيوي" },
  { ch: "ch8", lesson: "8", title: "طاقة المد والجزر" },
  { chapterName: "الفصل التاسع: فيزياء الجو وتقنية الاتصالات الحديثة" },
  { ch: "ch9", lesson: "1", title: "جو الأرض والغلاف الجوي" },
  { ch: "ch9", lesson: "2", title: "طبقات الغلاف الجوي الخمس" },
  { ch: "ch9", lesson: "3", title: "التروبوسفير والستراتوسفير" },
  { ch: "ch9", lesson: "4", title: "طبقة الأوزون" },
  { ch: "ch9", lesson: "5", title: "الميزوسفير والثرموسفير والإكسوسفير" },
  { ch: "ch9", lesson: "6", title: "انتشار الموجات اللاسلكية" },
  { ch: "ch9", lesson: "7", title: "الهاتف النقال" },
  { ch: "ch9", lesson: "8", title: "الأقمار الصناعية" },
  { chapterName: "══ السادس العلمي ══" },
  { chapterName: "الفصل التمهيدي: رياضيات الفيزياء" },
  { ch: "g6c0", lesson: "1", title: "الأعداد الأسية والوحدات" },
  { ch: "g6c0", lesson: "2", title: "الجذور التربيعية والتكعيبية" },
  { ch: "g6c0", lesson: "3", title: "الكسور والمقلوب وإيجاد المجهول" },
  { ch: "g6c0", lesson: "4", title: "التناسب والنسبة والنسبة المئوية" },
  { chapterName: "الفصل الأول" },
  { ch: "g6c1", lesson: "1", title: "الموصل الكروي المنفرد المعزول" },
  { ch: "g6c1", lesson: "2", title: "المتسعة والمتسعة ذات الصفيحتين المتوازيتين" },
  { ch: "g6c1", lesson: "3", title: "العازل الكهربائي" },
  { ch: "g6c1", lesson: "4", title: "العوامل المؤثرة في سعة المتسعة" },
  { ch: "g6c1", lesson: "5", title: "طرائق ربط المتسعات (توازٍ وتوالٍ)" },
  { ch: "g6c1", lesson: "6", title: "الطاقة المختزنة والقدرة" },
  { ch: "g6c1", lesson: "7", title: "دائرة RC — الشحن والتفريغ" },
  { ch: "g6c1", lesson: "8", title: "أنواع المتسعات والتطبيقات العملية" },
  { chapterName: "الفصل الثاني" },
  { ch: "g6c2", lesson: "1", title: "القوة على شحنة متحركة وقوة لورنتز" },
  { ch: "g6c2", lesson: "2", title: "القوة الدافعة المحتثة الحركية" },
  { ch: "g6c2", lesson: "3", title: "الفيض المغناطيسي" },
  { ch: "g6c2", lesson: "4", title: "قانون فاراداي" },
  { ch: "g6c2", lesson: "5", title: "قانون لنز" },
  { ch: "g6c2", lesson: "6", title: "الحث الذاتي" },
  { ch: "g6c2", lesson: "7", title: "الحث المتبادل" },
  { ch: "g6c2", lesson: "8", title: "المجالات الكهربائية المحتثة" },
  { ch: "g6c2", lesson: "9", title: "المولّدات والمحرّكات الكهربائية" },
  { ch: "g6c2", lesson: "10", title: "التطبيقات العملية" },
  { chapterName: "الفصل الثالث" },
  { ch: "g6c3", lesson: "1", title: "مقدمة والمقدار المؤثر للتيار المتناوب" },
  { ch: "g6c3", lesson: "2", title: "دائرة تيار متناوب تحتوي مقاومة صرفة R" },
  { ch: "g6c3", lesson: "3", title: "دائرة تحتوي محث صرف L" },
  { ch: "g6c3", lesson: "4", title: "دائرة تحتوي متسعة ذات سعة صرف C" },
  { ch: "g6c3", lesson: "5", title: "ربط التوالي R-L-C" },
  { ch: "g6c3", lesson: "6", title: "عامل القدرة والقدرة المستهلكة" },
  { ch: "g6c3", lesson: "7", title: "دائرة الرنين بربط التوالي" },
  { ch: "g6c3", lesson: "8", title: "ربط التوازي R-L-C" },
  { chapterName: "الفصل الرابع" },
  { ch: "g6c4", lesson: "1", title: "مقدمة" },
  { ch: "g6c4", lesson: "2", title: "ماكسويل والنظرية الكهرومغناطيسية" },
  { ch: "g6c4", lesson: "3", title: "توليد الموجات الكهرومغناطيسية من الشحنات المعجلة" },
  { ch: "g6c4", lesson: "4", title: "مبادئ الإرسال والتسلم للموجات الكهرومغناطيسية" },
  { ch: "g6c4", lesson: "5", title: "كيفية عمل دائرة الإرسال والتسلم" },
  { ch: "g6c4", lesson: "6", title: "الكشف عن الموجات الكهرومغناطيسية ذات التردد الراديوي" },
  { ch: "g6c4", lesson: "7", title: "التضمين — AM وFM وPM" },
  { ch: "g6c4", lesson: "8", title: "مدى الموجات الراديوية" },
  { ch: "g6c4", lesson: "9", title: "انتشار الموجات الكهرومغناطيسية" },
  { ch: "g6c4", lesson: "10", title: "بعض تطبيقات الموجات الكهرومغناطيسية" },
  { chapterName: "الفصل الخامس" },
  { ch: "g6c5", lesson: "1", title: "مقدمة في البصريات الفيزيائية" },
  { ch: "g6c5", lesson: "2", title: "تداخل الموجات الضوئية" },
  { ch: "g6c5", lesson: "3", title: "تجربة شقي يونك" },
  { ch: "g6c5", lesson: "4", title: "التداخل في الأغشية الرقيقة" },
  { ch: "g6c5", lesson: "5", title: "حيود موجات الضوء" },
  { ch: "g6c5", lesson: "6", title: "مُحزّز الحيود" },
  { ch: "g6c5", lesson: "7", title: "استقطاب الضوء" },
  { ch: "g6c5", lesson: "8", title: "استطارة الضوء" },
  { chapterName: "الفصل السادس" },
  { ch: "g6c6", lesson: "1", title: "مقدمة" },
  { ch: "g6c6", lesson: "2", title: "نظرية الكم — إشعاع الجسم الأسود وفرضية بلانك" },
  { ch: "g6c6", lesson: "3", title: "الظاهرة الكهروضوئية" },
  { ch: "g6c6", lesson: "4", title: "الجسيمات (الدقائق) والموجات" },
  { ch: "g6c6", lesson: "5", title: "الموجات المادية" },
  { ch: "g6c6", lesson: "6", title: "مدخل إلى مفهوم ميكانيك الكم ودالة الموجة" },
  { ch: "g6c6", lesson: "7", title: "مبدأ اللادقة (اللاتحديد) لهايزنبرغ" },
  { ch: "g6c6", lesson: "8", title: "النظرية النسبية" },
  { ch: "g6c6", lesson: "9", title: "فرضيتا آينشتاين للنسبية الخاصة" },
  { ch: "g6c6", lesson: "10", title: "تحويلات لورنتز" },
  { ch: "g6c6", lesson: "11", title: "أهم النتائج المترتبة على النظرية النسبية الخاصة" },
  { ch: "g6c6", lesson: "12", title: "تكافؤ الكتلة والطاقة" },
  { chapterName: "الفصل السابع" },
  { ch: "g6c7", lesson: "1", title: "مقدمة ومستويات الطاقة في الذرة" },
  { ch: "g6c7", lesson: "2", title: "حزم الطاقة — الموصلات والعوازل وأشباه الموصلات" },
  { ch: "g6c7", lesson: "3", title: "أشباه الموصلات النقية" },
  { ch: "g6c7", lesson: "4", title: "أشباه الموصلات المطعّمة" },
  { ch: "g6c7", lesson: "5", title: "الثنائي pn" },
  { ch: "g6c7", lesson: "6", title: "فولطية الانحياز للثنائي pn" },
  { ch: "g6c7", lesson: "7", title: "بعض أنواع الثنائيات" },
  { ch: "g6c7", lesson: "8", title: "الترانزستور" },
  { chapterName: "الفصل الثامن" },
  { ch: "g6c8", lesson: "1", title: "فشل أنموذج رذرفورد وفرضيات بور" },
  { ch: "g6c8", lesson: "2", title: "طيف ذرّة الهيدروجين وسلاسله" },
  { ch: "g6c8", lesson: "3", title: "الأنطياف وأنواعها" },
  { ch: "g6c8", lesson: "4", title: "الأشعة السينية" },
  { ch: "g6c8", lesson: "5", title: "تأثير كومبتن" },
  { ch: "g6c8", lesson: "6", title: "الليزر — التسمية والخصائص وآلية العمل" },
  { ch: "g6c8", lesson: "7", title: "التوزيع المعكوس ومكونات الليزر ومنظوماته" },
  { ch: "g6c8", lesson: "8", title: "أنواع الليزر وتطبيقاته" },
  { chapterName: "الفصل التاسع" },
  { ch: "g6c9", lesson: "1", title: "نموذج النواة وتركيبها وخصائصها" },
  { ch: "g6c9", lesson: "2", title: "طاقة الربط النووية" },
  { ch: "g6c9", lesson: "3", title: "انحلال ألفا" },
  { ch: "g6c9", lesson: "4", title: "انحلال بيتا وكاما" },
  { ch: "g6c9", lesson: "5", title: "التفاعلات النووية" },
  { ch: "g6c9", lesson: "6", title: "الانشطار النووي" },
  { ch: "g6c9", lesson: "7", title: "الاندماج النووي" },
  { ch: "g6c9", lesson: "8", title: "مخاطر وفوائد الإشعاع النووي" }
];

// فلترة بسيطة بالاسم: تخفي الصفوف غير المطابقة، وتخفي عنوان الفصل لو ما تبقّى تحته شي.
// تستعملها صفحتا activities.html و homework.html على عناصر act-row / data-chapter.
function filterActivityList(host, query) {
  var q = (query || "").trim().toLowerCase();
  var nodes = Array.prototype.slice.call(host.children);
  var currentHead = null, currentHeadHasVisible = false;

  function closeGroup() {
    if (currentHead) currentHead.style.display = (currentHeadHasVisible || !q) ? "" : "none";
  }

  nodes.forEach(function (node) {
    if (node.hasAttribute("data-chapter")) {
      closeGroup();
      currentHead = node;
      currentHeadHasVisible = false;
      return;
    }
    var match = !q || node.getAttribute("data-title").toLowerCase().indexOf(q) !== -1;
    node.style.display = match ? "" : "none";
    if (match) currentHeadHasVisible = true;
  });
  closeGroup();
}

// يبني قائمة الأنشطة مقسومة بتبويبات حسب المرحلة (كل عنوان يبدأ بـ «══» يفتح مرحلة).
// تستعمله صفحتا activities.html و homework.html — كل صفحة تعطي طريقة رسم صف الدرس فقط.
//   host        : العنصر اللي تنبني بداخله أزرار التبويبات
//   opts.panelsHost : مكان قوائم الدروس (افتراضياً نفس host تحت الأزرار)
//   renderRow   : function(item) ترجع عنصر صف الدرس (act-row مع data-title)
//   opts.search : خانة البحث (تفلتر المرحلة المفتوحة فقط)
//   opts.headPrefix : نص قبل اسم الفصل (مثل "📖 ")
//   opts.storageKey : مفتاح localStorage لتذكّر آخر مرحلة فتحها المستخدم
// المرحلة المفتوحة أولاً: فصل الرابط (#g6c1) إن وُجد، وإلا آخر مرحلة محفوظة، وإلا الأولى.
function renderActivityStages(host, renderRow, opts) {
  opts = opts || {};
  var stages = [];
  var stage = null, currentHead = null;

  (window.SHARARA_ACTIVITIES || []).forEach(function (item) {
    if (item.chapterName && /^══/.test(item.chapterName)) {
      stage = { label: item.chapterName.replace(/═/g, "").trim(), grade: "", list: document.createElement("div"), count: 0 };
      stages.push(stage);
      currentHead = null;
      return;
    }
    if (!stage) return;
    if (item.chapterName) {
      currentHead = document.createElement("div");
      currentHead.className = "act-chapter-head";
      currentHead.setAttribute("data-chapter", "1");
      currentHead.textContent = (opts.headPrefix || "") + item.chapterName;
      stage.list.appendChild(currentHead);
      return;
    }
    // أول درس تحت عنوان الفصل يعطي العنوان معرّفاً (#g6c1 مثلاً) حتى تقفز له
    // روابط "فهرس الواجبات" من صفحات الواجب مباشرة على فصل الطالب.
    if (currentHead && !currentHead.id) currentHead.id = item.ch;
    if (!stage.grade) stage.grade = /^g6/.test(item.ch) ? "g6" : "g3";
    stage.count++;
    stage.list.appendChild(renderRow(item));
  });

  var tabs = document.createElement("div");
  tabs.className = "gradetabs act-stagetabs";
  tabs.setAttribute("role", "tablist");
  tabs.setAttribute("aria-label", "اختر المرحلة الدراسية");
  var panelsHost = opts.panelsHost || host;
  host.innerHTML = "";
  if (panelsHost !== host) panelsHost.innerHTML = "";
  host.appendChild(tabs);

  stages.forEach(function (s, i) {
    s.panel = document.createElement("div");
    s.panel.className = "gradepanel";
    s.panel.id = "stage-panel-" + i;
    s.panel.setAttribute("role", "tabpanel");
    s.panel.appendChild(s.list);
    panelsHost.appendChild(s.panel);

    s.tab = document.createElement("button");
    s.tab.type = "button";
    s.tab.className = "gradetab";
    s.tab.setAttribute("role", "tab");
    s.tab.setAttribute("aria-controls", s.panel.id);
    s.tab.setAttribute("data-grade", s.grade);
    s.tab.textContent = s.label + " ";
    var badge = document.createElement("span");
    badge.className = "tab-badge";
    badge.textContent = s.count;
    s.tab.appendChild(badge);
    s.tab.addEventListener("click", function () { select(i, true); });
    tabs.appendChild(s.tab);
  });

  var active = 0;
  function select(i, remember) {
    active = i;
    stages.forEach(function (s, j) {
      var on = j === i;
      s.tab.classList.toggle("active", on);
      s.tab.setAttribute("aria-selected", on ? "true" : "false");
      s.panel.hidden = !on;
    });
    if (opts.search) filterActivityList(stages[i].list, opts.search.value);
    if (remember && opts.storageKey) {
      try { localStorage.setItem(opts.storageKey, String(i)); } catch (e) {}
    }
  }

  var start = 0;
  var hashCh = decodeURIComponent((location.hash || "").slice(1));
  var target = hashCh && document.getElementById(hashCh);
  var fromHash = -1;
  stages.forEach(function (s, i) { if (target && s.list.contains(target)) fromHash = i; });
  if (fromHash >= 0) {
    start = fromHash;
  } else if (opts.storageKey) {
    try {
      var saved = parseInt(localStorage.getItem(opts.storageKey), 10);
      if (saved >= 0 && saved < stages.length) start = saved;
    } catch (e) {}
  }
  select(start, false);

  if (opts.search) {
    opts.search.addEventListener("input", function () {
      filterActivityList(stages[active].list, this.value);
    });
  }

  // القوائم تُبنى بالسكربت، فالقفز التلقائي لـ #الفصل ما يلحقها — نقفز يدوياً بعد
  // اكتمال التحميل (الخطوط وإضافات core.js تغيّر الارتفاعات قبلها فيضيع الموضع).
  if (fromHash >= 0) {
    // قفزة فورية (instant): الموقع مفعّل فيه scroll-behavior: smooth، والتمرير
    // الناعم وقت التحميل ينقطع فتبقى الصفحة بأعلاها.
    var jump = function () {
      window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 12, behavior: "instant" });
    };
    if (document.readyState === "complete") jump();
    else window.addEventListener("load", jump);
  }
}
