#!/usr/bin/env node
/*
 * استخراج بيانات الفصل التمهيدي للسادس (g6c0) من صفحات HTML إلى نفس مخطط
 * extracted/g6cN-lessons.json الذي تقرأه صفحة المراجعة (js/review.js) والبحث (js/search.js).
 *
 * المخرجات (نفس طريقة بقية فصول السادس):
 *   extracted/g6c0-lessons.json          ← المصدر المستخرج
 *   js/lessons-data-g6c0.js              ← لصفحة المراجعة (تحميل مؤجّل بعد التفعيل)
 *   js/lessons-data-g6.js                ← الملف المجمّع للبحث: تُستبدل عناصر g6c0 فقط وتوضع أولاً
 *
 * التشغيل:  node tools/extract-lessons-g6c0.js   (أعد تشغيله بعد أي تعديل على دروس g6c0)
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CH = 'g6c0', CH_TITLE = 'الفصل التمهيدي: رياضيات الفيزياء', N_LESSONS = 7;
const DIR = path.join(ROOT, 'chapters', CH);
const PRE = 'window.PHY_LESSONS = (window.PHY_LESSONS || []).concat(';

const ENT = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
const rootsToText = (h) => {
  // ترميز الجذر والكسر (يرسمه core.js بشكل الكتاب) يرجع نصاً: √(…) و a/b، من الداخل للخارج
  // البسط بلا قوسين إن كان حدّاً واحداً بلا عمليات (2PE، ΔI)، والمقام بلا قوسين إن كان رمزاً
  // مفرداً أو عدداً (C، Δt، C_eq، 24)، وإلا بين قوسين: h/(mλ)، 1/(2πfC)
  const simpleNum = (x) => /^[0-9A-Za-zΑ-Ωα-ωΔΦ_₀-₉⁰¹²³⁴⁵⁶⁷⁸⁹ₑπ.]+$/.test(x) || /^[√∛]\([^()]*\)$/.test(x)
  const simpleDen = (x) => /^[0-9.]+$/.test(x) || /^Δ?[A-Za-zΑ-Ωα-ω](_[A-Za-z0-9]+|[₀-₉ₑ⁰¹²³⁴⁵⁶⁷⁸⁹]*)$/.test(x) || /^[√∛]\([^()]*\)$/.test(x)
  let prev
  do {
    prev = h
    h = h.replace(/<span class=['"]sqrt['"](?: data-n=['"]3['"])?>([√∛])<span class=['"]rad['"]>([^<]*)<\/span><\/span>/g,
      (m, sym, rad) => sym + (/^[0-9.]+$/.test(rad) ? rad : '(' + rad + ')'))
    h = h.replace(/<span class=['"]frac['"]><span class=['"]num['"]>([^<]*)<\/span><span class=['"]den['"]>([^<]*)<\/span><\/span>/g,
      (m, n, d) => (simpleNum(n) ? n : '(' + n + ')') + '/' + (simpleDen(d) ? d : '(' + d + ')'))
  } while (h !== prev)
  return h
}
const text = h => rootsToText(h).replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z#0-9]+;/g, e => ENT[e] || e).replace(/\s+/g, ' ').trim();

// كل عناصر <tag class="... cls ..."> مع محتواها، بموازنة الوسوم المتداخلة من نفس النوع
function blocks(html, tag, cls) {
  const out = [], open = new RegExp(`<${tag}\\b[^>]*class="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`, 'g');
  let m;
  while ((m = open.exec(html))) {
    const re = new RegExp(`<${tag}\\b|</${tag}>`, 'g');
    re.lastIndex = m.index + m[0].length;
    let depth = 1, t;
    while (depth && (t = re.exec(html))) depth += t[0][1] === '/' ? -1 : 1;
    out.push({ start: m.index, inner: html.slice(m.index + m[0].length, t.index) });
  }
  return out;
}
const first = (html, re) => { const m = html.match(re); return m ? text(m[1]) : ''; };
const isMinisterial = s => /سؤال وزاري/.test(s);

function lesson(n) {
  const html = fs.readFileSync(path.join(DIR, `lesson${n}.html`), 'utf8');
  const body = html.slice(html.indexOf('<div class="wrap">'), html.indexOf('<script src="../../js/core.js">'));
  const h1 = first(body, /<h1>([\s\S]*?)<\/h1>/);
  const hook = blocks(body, 'div', 'hook')[0];

  const concepts = blocks(body, 'div', 'defbox').map(b => {
    const term = first(b.inner, /<b class="term">([\s\S]*?)<\/b>/);
    return { term, text: text(b.inner).replace(/^📌\s*|^⚠️\s*/, '').replace(term, '').trim(), ministerial: false };
  });
  const laws = blocks(body, 'div', 'lawbox').map(b => ({
    name: text(b.inner.split('<div class="formula">')[0]),
    formula: (b.inner.match(/<div class="formula">([\s\S]*?)<\/div>/g) || []).map(text).join(' · '),
    variables_note: ''
  }));
  // نستثني صندوق النشاط المنزلي وصندوق «وين راح تحتاجها؟» (روابط تنقّل، لا محتوى)
  const notes = blocks(body, 'div', 'notebox')
    .filter(b => !/نشاط منزلي|وين راح تحتاجها/.test(b.inner))
    .map(b => {
      const heading = first(b.inner, /<b>([\s\S]*?)<\/b>/);
      const lis = (b.inner.match(/<li>([\s\S]*?)<\/li>/g) || []).map(text);
      const rest = text(b.inner.replace(/<b>[\s\S]*?<\/b>/, '').replace(/<ul>[\s\S]*?<\/ul>/g, ''));
      return { heading, items: lis.length ? (rest ? [rest, ...lis] : lis) : [rest], ministerial: false };
    });
  const tables = [];
  for (const m of body.matchAll(/<table class="nice">([\s\S]*?)<\/table>/g)) {
    const rows = (m[1].match(/<tr>[\s\S]*?<\/tr>/g) || []).map(r => (r.match(/<t[hd]>[\s\S]*?<\/t[hd]>/g) || []).map(text));
    const before = body.slice(0, m.index), sec = [...before.matchAll(/<div class="section-title">([\s\S]*?)<\/div>/g)].pop();
    tables.push({ caption: sec ? text(sec[1]) : '', ministerial: false, headers: rows[0], rows: rows.slice(1) });
  }
  const examples = blocks(body, 'div', 'example').map(b => {
    const problem = first(b.inner, /<div class="exq">([\s\S]*?)<\/div>/);
    return {
      problem,
      givens: first(b.inner, /<div class="givens">([\s\S]*?)<\/div>/),
      solution_steps: blocks(b.inner, 'div', 'step').map(s => text(s.inner)),
      ministerial: isMinisterial(problem)
    };
  });
  const sim = blocks(body, 'div', 'sim')[0];
  return {
    chapter_number: CH, chapter_title: CH_TITLE,
    lesson_number: n, lesson_title: h1.replace(/^.*?الدرس \d+:\s*/, ''), order_index: n,
    hook: hook ? text(hook.inner.replace(/<span class="em">[\s\S]*?<\/span>/, '')) : '',
    concepts, laws, notes, tables, examples, qa: [],
    has_simulation: !!sim, simulation_title: sim ? first(sim.inner, /<h3>([\s\S]*?)<\/h3>/) : ''
  };
}

// عنصر «أسئلة ومسائل نهاية الفصل» الاصطناعي — البحث يوجّهه إلى questions.html (نفس عُرف g6c1)
function finalExam() {
  const html = fs.readFileSync(path.join(DIR, 'questions.html'), 'utf8');
  const arr = html.match(/Phy\.quiz\("qz", (\[[\s\S]*?\n\]), \{/)[1];
  const qs = (0, eval)(arr);
  return {
    chapter_number: CH, chapter_title: CH_TITLE,
    lesson_number: N_LESSONS + 1, lesson_title: 'أسئلة ومسائل نهاية الفصل', order_index: N_LESSONS + 1,
    hook: '', concepts: [], laws: [], notes: [], tables: [], examples: [],
    qa: qs.map(q => ({ question: rootsToText(q.q), answer: rootsToText(q.opts[q.a] + ' — ' + q.why), type: 'سؤال', ministerial: false })),
    has_simulation: false, simulation_title: ''
  };
}

const data = [];
for (let n = 1; n <= N_LESSONS; n++) data.push(lesson(n));
data.push(finalExam());

fs.writeFileSync(path.join(ROOT, 'extracted', `${CH}-lessons.json`), JSON.stringify(data, null, 2) + '\n');
fs.writeFileSync(path.join(ROOT, 'js', `lessons-data-${CH}.js`), PRE + JSON.stringify(data) + ');\n');

// الملف المجمّع: نحذف أي عناصر g6c0 سابقة ونضع الجديدة بالبداية (ترتيب الفصول g6c0 → g6c9)
const allFile = path.join(ROOT, 'js', 'lessons-data-g6.js');
const all = fs.readFileSync(allFile, 'utf8');
if (!all.startsWith(PRE) || !all.endsWith(');')) throw new Error('lessons-data-g6.js بصيغة غير متوقعة — توقّف');
const arr = JSON.parse(all.slice(PRE.length, -2)).filter(l => l.chapter_number !== CH);
fs.writeFileSync(allFile, PRE + JSON.stringify(data.concat(arr)) + ');');

const count = k => data.reduce((s, l) => s + l[k].length, 0);
console.log(`${CH}: ${data.length} عنصراً — مفاهيم ${count('concepts')}، قوانين ${count('laws')}، ملاحظات ${count('notes')}، جداول ${count('tables')}، أمثلة ${count('examples')}، أسئلة ${count('qa')}`);
console.log(`lessons-data-g6.js: ${data.length + arr.length} عنصراً (منها ${arr.length} لبقية الفصول)`);
