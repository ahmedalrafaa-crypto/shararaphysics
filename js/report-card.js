/* ============================================================
   بطاقة تقرير الأداء — صورة PNG قابلة للمشاركة مع ولي الأمر
   buildReportData()  يقرأ التقدّم الحقيقي من Phy (core.js)
   renderReportCard(data)  يرسم البطاقة على canvas ويُعيد Promise<canvas>
   shareReportCard(data)   يشارك الصورة عبر navigator.share أو ينزّلها
   ============================================================ */
(function () {
  // يُلتقط الآن لأن document.currentScript يصلح فقط أثناء التنفيذ
  // التزامني لهذا السكربت؛ نحتاجه لإيجاد مسار assets الصحيح بغض النظر
  // عن عمق الصفحة المستدعية (الجذر أو داخل مجلد فرعي مثل analysis/)
  var SCRIPT_SRC = document.currentScript && document.currentScript.src;
  function assetURL(rel) {
    try { return new URL(rel, SCRIPT_SRC).href; } catch (e) { return rel; }
  }

  /* ---------- بيانات الفصول (مطابقة لِـ CH في analysis/index.html) ---------- */
  var CH = {
    ch0: { t: "الفصل التمهيدي: أساسيات الرياضيات", em: "🧮" },
    ch1: { t: "الفصل الأول: الكهربائية الساكنة", em: "⚡" },
    ch2: { t: "الفصل الثاني: المغناطيس", em: "🧲" },
    ch3: { t: "الفصل الثالث: التيار الكهربائي", em: "🔌" },
    ch4: { t: "الفصل الرابع: البطارية والقوة الدافعة", em: "🔋" },
    ch5: { t: "الفصل الخامس: الطاقة والقدرة الكهربائية", em: "💡" },
    ch6: { t: "الفصل السادس: الكهربائية والمغناطيسية", em: "🌀" },
    ch7: { t: "الفصل السابع: المحولة الكهربائية", em: "🔌" },
    ch8: { t: "الفصل الثامن: تكنولوجيا مصادر الطاقة", em: "🔆" },
    ch9: { t: "الفصل التاسع: فيزياء الجو والاتصالات", em: "🛰️" }
  };
  // هوية لونية لكل فصل — يجب أن تبقى مطابقة لقيم --cc في
  // css/style.css (.chcard[data-ch]) حتى يرى الطالب نفس ألوان خريطة الفصول
  var CH_COLOR = {
    ch0: "#ea34cb", ch1: "#725be6", ch2: "#e63d37", ch3: "#0ea026", ch4: "#08af78",
    ch5: "#db7706", ch6: "#2466eb", ch7: "#b23bed", ch8: "#45a216", ch9: "#02a4c5"
  };

  function pct(c, t) { return t ? Math.round(100 * c / t) : 0; }
  function chShortName(t) {
    var i = t.indexOf(":");
    return i > -1 ? t.slice(i + 1).trim() : t;
  }
  // نفس عتبات ومستويات analysis/index.html (level) للاتساق بين الصفحتين
  function levelColor(p) {
    if (p >= 85) return "#2ecc8f";
    if (p >= 70) return "#4d96ff";
    if (p >= 50) return "#f0a500";
    return "#ff6b6b";
  }
  function levelLabel(p) {
    if (p >= 85) return "ممتاز";
    if (p >= 70) return "جيد";
    if (p >= 50) return "يحتاج مراجعة";
    return "ضعيف";
  }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }

  /* ============================================================
     بناء بيانات التقرير من التخزين الفعلي
     ============================================================ */
  function buildReportData() {
    var attempts = Phy.getAttempts();
    var progress = Phy.load();

    var byChapter = {}, totalCorrect = 0;
    attempts.forEach(function (r) {
      if (r.ok) totalCorrect++;
      var b = byChapter[r.ch] || (byChapter[r.ch] = { correct: 0, total: 0 });
      b.total++;
      if (r.ok) b.correct++;
    });

    var topics = Object.keys(byChapter).sort().map(function (ch) {
      var b = byChapter[ch], info = CH[ch];
      return {
        ch: ch,
        name: info ? chShortName(info.t) : ch,
        emoji: info ? info.em : "📘",
        total: b.total,
        correct: b.correct,
        percent: pct(b.correct, b.total),
        color: CH_COLOR[ch] || "#6c5ce7"
      };
    });

    var starsTotal = 0;
    Object.keys(progress).forEach(function (ch) {
      var c = progress[ch] || {};
      if (c.lessons) {
        Object.keys(c.lessons).forEach(function (l) { starsTotal += c.lessons[l].stars || 0; });
      }
      if (c.exam) starsTotal += c.exam.stars || 0;
    });

    return {
      generatedAt: Date.now(),
      totalQuestions: attempts.length,
      totalCorrect: totalCorrect,
      overall: pct(totalCorrect, attempts.length),
      chaptersStudied: topics.length,
      starsTotal: starsTotal,
      topics: topics
    };
  }

  /* ---------- تحميل الخط والشعار قبل الرسم (لتفادي خط بديل داخل الصورة المصدَّرة) ---------- */
  function ensureFonts() {
    if (!document.fonts) return Promise.resolve();
    var jobs = ["400", "600", "700", "800", "900"].map(function (w) {
      return document.fonts.load(w + " 16px Cairo");
    });
    jobs.push(document.fonts.ready);
    return Promise.all(jobs).catch(function () {});
  }
  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  /* ---------- مستطيل بزوايا دائرية (يبني المسار فقط؛ الملء/الحد على المستدعي) ---------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  // اختصار نص لا يتجاوز عرضاً معيناً (يفترض ضبط ctx.font قبل الاستدعاء)
  function fitText(ctx, text, maxWidth) {
    if (ctx.measureText(text).width <= maxWidth) return text;
    var t = text;
    while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
    return t + "…";
  }

  var FONT = "Cairo, 'Segoe UI', Tahoma, sans-serif";

  /* ============================================================
     الرسم الرئيسي
     ============================================================ */
  function renderReportCard(data) {
    data = data || buildReportData();
    return Promise.all([ensureFonts(), loadImage(assetURL("../assets/logo-ar.png"))])
      .then(function (res) {
        var logo = res[1];

        var W = 1080, M = 56;
        var HEADER_H = 300;
        var OV_Y = HEADER_H + 30, OV_H = 340, OV_BOTTOM = OV_Y + OV_H;
        var SEC_Y = OV_BOTTOM + 40, SEC_H = 56, SEC_BOTTOM = SEC_Y + SEC_H;
        var TOPICS_Y = SEC_BOTTOM + 14;
        var ROW_H = 72, PAD_TOP = 36, PAD_BOTTOM = 30;
        var topics = data.topics || [];
        var TOPICS_H = topics.length ? (PAD_TOP + PAD_BOTTOM + topics.length * ROW_H) : 210;
        var TOPICS_BOTTOM = TOPICS_Y + TOPICS_H;
        var FOOTER_Y = TOPICS_BOTTOM + 40, FOOTER_H = 160;
        var H = FOOTER_Y + FOOTER_H + 30;

        // رسم بدقّة ×2 ليبقى واضحاً عند العرض على شاشات الجوّال عالية الكثافة
        var SCALE = 2;
        var canvas = document.createElement("canvas");
        canvas.width = W * SCALE; canvas.height = H * SCALE;
        var ctx = canvas.getContext("2d");
        ctx.scale(SCALE, SCALE);
        ctx.direction = "rtl";
        ctx.textBaseline = "middle";

        var ink = cssVar("--ink", "#2d3142");
        var inkSoft = cssVar("--ink-soft", "#5c6178");
        var violet = cssVar("--violet", "#6c5ce7");
        var violetDeep = cssVar("--violet-deep", "#4834d4");
        var bg = cssVar("--bg", "#f4f6ff");
        var card = cssVar("--card", "#ffffff");
        var yellow = cssVar("--yellow", "#ffc93c");
        var track = "#e9ebfa";

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        /* ---------- الترويسة ---------- */
        var hg = ctx.createLinearGradient(0, 0, W, HEADER_H);
        hg.addColorStop(0, violet);
        hg.addColorStop(1, "#2d71d2"); // نفس تدرّج .hero في style.css
        ctx.fillStyle = hg;
        ctx.fillRect(0, 0, W, HEADER_H);

        // برق زخرفي شفاف أعلى يسار الترويسة، يطابق .hero::before في الموقع
        ctx.save();
        ctx.globalAlpha = 0.13;
        ctx.fillStyle = "#ffffff";
        ctx.font = "260px sans-serif";
        ctx.textAlign = "center";
        ctx.translate(190, 175);
        ctx.rotate(-15 * Math.PI / 180);
        ctx.fillText("⚡", 0, 0);
        ctx.restore();

        var brandRight = W - M;
        if (logo) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(brandRight - 28, 60, 28, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logo, brandRight - 56, 32, 56, 56);
          ctx.restore();
        }
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "right";
        ctx.font = "700 24px " + FONT;
        ctx.fillText("فيزياء أ. أحمد رافع", brandRight - 70, 60);

        ctx.font = "900 56px " + FONT;
        ctx.fillText("تقرير الأداء", brandRight, 148);

        ctx.globalAlpha = 0.9;
        ctx.font = "700 25px " + FONT;
        ctx.fillText("ملخّص أدائك في مادة الفيزياء — شاركه مع ولي أمرك", brandRight, 196);
        ctx.globalAlpha = 1;

        var dateStr = new Date(data.generatedAt).toLocaleDateString("ar-IQ", {
          year: "numeric", month: "long", day: "numeric", numberingSystem: "latn"
        });
        var chipText = "📅 " + dateStr;
        ctx.font = "700 21px " + FONT;
        var chipH = 40, chipW = ctx.measureText(chipText).width + 36, chipY = 234;
        ctx.fillStyle = "rgba(255,255,255,.22)";
        rr(ctx, brandRight - chipW, chipY, chipW, chipH, chipH / 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillText(chipText, brandRight - 18, chipY + chipH / 2);

        /* ---------- بطاقة النظرة العامة ---------- */
        ctx.save();
        ctx.shadowColor = "rgba(72,52,212,.16)";
        ctx.shadowBlur = 34;
        ctx.shadowOffsetY = 14;
        ctx.fillStyle = card;
        rr(ctx, M, OV_Y, W - 2 * M, OV_H, 26);
        ctx.fill();
        ctx.restore();

        var ringCx = W - M - 150, ringCy = OV_Y + 150, ringR = 92, ringThick = 20;
        var lvColor = levelColor(data.overall);

        ctx.lineCap = "butt";
        ctx.lineWidth = ringThick;
        ctx.strokeStyle = track;
        ctx.beginPath(); ctx.arc(ringCx, ringCy, ringR, 0, 2 * Math.PI); ctx.stroke();
        if (data.overall > 0) {
          ctx.strokeStyle = lvColor;
          ctx.beginPath();
          ctx.arc(ringCx, ringCy, ringR, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * (data.overall / 100));
          ctx.stroke();
        }
        ctx.fillStyle = ink;
        ctx.textAlign = "center";
        ctx.font = "900 46px " + FONT;
        ctx.fillText(data.overall + "%", ringCx, ringCy - 8);
        ctx.fillStyle = inkSoft;
        ctx.font = "700 17px " + FONT;
        ctx.fillText("الإتقان العام", ringCx, ringCy + 26);

        // شارة النجوم أسفل الحلقة
        var starsH = 40;
        var starsCy = ringCy + ringR + 34 + starsH / 2;
        var starsText = "⭐ " + data.starsTotal + " نجمة";
        ctx.font = "800 19px " + FONT;
        var starsW = ctx.measureText(starsText).width + 34;
        ctx.fillStyle = "#fff8e6";
        rr(ctx, ringCx - starsW / 2, starsCy - starsH / 2, starsW, starsH, starsH / 2);
        ctx.fill();
        ctx.strokeStyle = yellow;
        ctx.lineWidth = 2;
        rr(ctx, ringCx - starsW / 2, starsCy - starsH / 2, starsW, starsH, starsH / 2);
        ctx.stroke();
        ctx.fillStyle = "#b7791f";
        ctx.textAlign = "center";
        ctx.fillText(starsText, ringCx, starsCy);

        // نص وتقييم ولوحات إحصاءات على يسار البطاقة
        var leftX = M + 34;
        var leftRight = ringCx - ringR - 46;
        ctx.textAlign = "right";
        ctx.fillStyle = ink;
        ctx.font = "800 27px " + FONT;
        ctx.fillText("تقويمك العام", leftRight, OV_Y + 56);

        var lvLabel = levelLabel(data.overall);
        ctx.font = "800 17px " + FONT;
        var lvH = 32, lvW = ctx.measureText(lvLabel).width + 28, lvY = OV_Y + 78;
        ctx.fillStyle = lvColor;
        rr(ctx, leftRight - lvW, lvY, lvW, lvH, lvH / 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 17px " + FONT;
        ctx.textAlign = "right";
        ctx.fillText(lvLabel, leftRight - 14, lvY + lvH / 2);

        var tiles = [
          { n: data.totalQuestions, k: "سؤالاً حللته" },
          { n: data.totalCorrect, k: "إجابة صحيحة" },
          { n: data.chaptersStudied, k: "فصلاً تدرّبت عليه" }
        ];
        var tileGap = 14;
        var tileW = (leftRight - leftX - tileGap * 2) / 3;
        var tileY = OV_Y + 134, tileH = 108;
        tiles.forEach(function (t, i) {
          var tx = leftRight - (i + 1) * tileW - i * tileGap;
          ctx.fillStyle = "#f0f2ff";
          rr(ctx, tx, tileY, tileW, tileH, 16);
          ctx.fill();
          ctx.fillStyle = violetDeep;
          ctx.textAlign = "center";
          ctx.font = "900 30px " + FONT;
          ctx.fillText(String(t.n), tx + tileW / 2, tileY + 42);
          ctx.fillStyle = inkSoft;
          ctx.font = "700 15px " + FONT;
          ctx.fillText(t.k, tx + tileW / 2, tileY + 76);
        });

        /* ---------- عنوان قسم الفصول ---------- */
        var iconX = W - M - 44, iconY = SEC_Y + 6;
        var ig = ctx.createLinearGradient(iconX, iconY, iconX + 44, iconY + 44);
        ig.addColorStop(0, violet); ig.addColorStop(1, "#4d96ff");
        ctx.fillStyle = ig;
        rr(ctx, iconX, iconY, 44, 44, 14);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "26px sans-serif";
        ctx.fillText("📚", iconX + 22, iconY + 24);
        ctx.fillStyle = ink;
        ctx.textAlign = "right";
        ctx.font = "900 28px " + FONT;
        ctx.fillText("الإتقان حسب الفصل", iconX - 16, iconY + 24);
        ctx.strokeStyle = "rgba(45,49,66,.09)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(M, SEC_BOTTOM - 2); ctx.lineTo(W - M, SEC_BOTTOM - 2); ctx.stroke();

        /* ---------- بطاقة الفصول ---------- */
        ctx.save();
        ctx.shadowColor = "rgba(72,52,212,.16)";
        ctx.shadowBlur = 34;
        ctx.shadowOffsetY = 14;
        ctx.fillStyle = card;
        rr(ctx, M, TOPICS_Y, W - 2 * M, TOPICS_H, 26);
        ctx.fill();
        ctx.restore();

        if (!topics.length) {
          ctx.fillStyle = ink;
          ctx.textAlign = "center";
          ctx.font = "60px sans-serif";
          ctx.fillText("🧭", W / 2, TOPICS_Y + 78);
          ctx.font = "800 24px " + FONT;
          ctx.fillText("لم تبدأ رحلتك بعد!", W / 2, TOPICS_Y + 130);
          ctx.fillStyle = inkSoft;
          ctx.font = "700 17px " + FONT;
          ctx.fillText("حلّ اختباراً واحداً على الأقل ليظهر أداؤك هنا", W / 2, TOPICS_Y + 164);
        } else {
          var labelX0 = W - M - 34, labelX1 = labelX0 - 210;
          var valueX = M + 34 + 70;
          var trackX0 = M + 34 + 100, trackX1 = labelX1 - 26;
          var trackW = trackX1 - trackX0, trackH = 18;

          topics.forEach(function (tp, i) {
            var rowTop = TOPICS_Y + PAD_TOP + i * ROW_H;
            var midY = rowTop + ROW_H / 2 - 10;
            var trackY = midY - trackH / 2;

            ctx.fillStyle = ink;
            ctx.textAlign = "right";
            ctx.font = "800 21px " + FONT;
            ctx.fillText(fitText(ctx, tp.emoji + " " + tp.name, labelX0 - labelX1), labelX0, midY);

            ctx.fillStyle = track;
            rr(ctx, trackX0, trackY, trackW, trackH, trackH / 2);
            ctx.fill();

            if (tp.percent > 0) {
              var fillW = Math.max(trackH, trackW * (tp.percent / 100));
              ctx.fillStyle = tp.color;
              rr(ctx, trackX1 - fillW, trackY, fillW, trackH, trackH / 2);
              ctx.fill();
            }

            ctx.fillStyle = tp.color;
            ctx.textAlign = "right";
            ctx.font = "800 21px " + FONT;
            ctx.fillText(tp.percent + "%", valueX, midY);

            if (i < topics.length - 1) {
              ctx.strokeStyle = "#f0f2ff";
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(M + 34, rowTop + ROW_H - 6);
              ctx.lineTo(W - M - 34, rowTop + ROW_H - 6);
              ctx.stroke();
            }
          });
        }

        /* ---------- التذييل ---------- */
        ctx.strokeStyle = "rgba(45,49,66,.09)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(M, FOOTER_Y); ctx.lineTo(W - M, FOOTER_Y); ctx.stroke();

        var fCx = W / 2, fY = FOOTER_Y + 46;
        if (logo) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(fCx, fY, 26, 0, 2 * Math.PI);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logo, fCx - 26, fY - 26, 52, 52);
          ctx.restore();
        }
        ctx.textAlign = "center";
        ctx.fillStyle = ink;
        ctx.font = "800 20px " + FONT;
        ctx.fillText("إعداد الأستاذ أحمد رافع", fCx, fY + 54);
        ctx.fillStyle = inkSoft;
        ctx.font = "700 16px " + FONT;
        ctx.fillText("فيزياء الصف الثالث متوسط · 📞 07800155157", fCx, fY + 82);
        ctx.fillStyle = violetDeep;
        ctx.font = "800 18px " + FONT;
        ctx.fillText("استمر بالتقدّم، أنت على الطريق الصحيح! 🚀", fCx, fY + 118);

        return canvas;
      });
  }

  /* ---------- المشاركة أو التنزيل ---------- */
  function downloadBlob(blob, fileName) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function shareReportCard(data) {
    return renderReportCard(data).then(function (canvas) {
      return new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (!blob) { reject(new Error("تعذّر إنشاء صورة التقرير")); return; }
          var fileName = "تقرير-الأداء-" + new Date().toISOString().slice(0, 10) + ".png";
          var file = null;
          try { file = new File([blob], fileName, { type: "image/png" }); } catch (e) {}

          if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({
              files: [file],
              title: "تقرير الأداء",
              text: "شاهد تقرير أدائي في مادة الفيزياء 📊"
            }).then(resolve).catch(function (err) {
              if (err && err.name === "AbortError") { resolve(); return; }
              downloadBlob(blob, fileName);
              resolve();
            });
          } else {
            downloadBlob(blob, fileName);
            resolve();
          }
        }, "image/png");
      });
    });
  }

  window.buildReportData = buildReportData;
  window.renderReportCard = renderReportCard;
  window.shareReportCard = shareReportCard;
})();
