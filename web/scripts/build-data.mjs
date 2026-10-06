// Gom dữ liệu từ ../data-src thành public/data/*.json cho website.
// - Danh sách từ theo cấp: data-src/levels_raw.json (lấy từ mock.tangce.cn)
// - Nội dung đã soạn:      data-src/content/hsk{L}*.txt
//   词|pinyin|hán việt|nghĩa VI|meaning EN|例句|câu dịch VI|sentence EN|tag[|pinyin câu ghi đè]
// Pinyin của câu ví dụ được sinh tự động bằng pinyin-pro (theo ngữ cảnh cả câu),
// có thể ghi đè bằng cột thứ 10 (các âm tiết cách nhau bởi dấu cách, mỗi chữ Hán một âm).
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin, customPinyin } from 'pinyin-pro';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'data-src');
const out = join(root, 'web', 'public', 'data');
mkdirSync(out, { recursive: true });

const HAN = /\p{Script=Han}/u;
const levels = JSON.parse(readFileSync(join(src, 'levels_raw.json'), 'utf8'));
const tags = JSON.parse(readFileSync(join(src, 'tags.json'), 'utf8'));

function readContent(level) {
  const files = readdirSync(join(src, 'content'))
    .filter((f) => new RegExp(`^hsk${level}[^0-9]?.*\\.txt$`).test(f))
    .sort();
  const byWord = new Map();
  for (const f of files) {
    for (const line of readFileSync(join(src, 'content', f), 'utf8').split(/\r?\n/)) {
      if (!line.trim() || line.startsWith('#')) continue;
      const p = line.split('|').map((s) => s.trim());
      if (p.length < 9) continue;
      const [w, py, hv, vi, en, zh, svi, sen, tag, pyOverride] = p;
      if (!byWord.has(w)) byWord.set(w, []);
      byWord.get(w).push({ w, py, hv, vi, en, ex: { zh, vi: svi, en: sen, tag, pyOverride } });
    }
  }
  return byWord;
}

// Tập âm tiết pinyin hợp lệ (không dấu), lấy từ CC-CEDICT, để tách "péngyou" -> ["péng","you"].
const SYLLABLES = new Set(['r']);
for (const line of readFileSync(join(src, 'cedict_ts.u8'), 'utf8').split('\n')) {
  const m = line.match(/\[(.*?)\]/);
  if (!m) continue;
  for (const s of m[1].toLowerCase().split(' ')) {
    const t = s.replace(/[1-5]$/, '').replace('u:', 'ü');
    if (/^[a-zü]+$/.test(t)) SYLLABLES.add(t.replace('ü', 'u')); // so khớp sau khi bỏ dấu (ü -> u)
  }
}
const toneless = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');

// Tách pinyin của một từ thành đúng n âm tiết (quy hoạch động trên tập âm tiết hợp lệ).
// Âm tiết bắt đầu bằng a/o/e chỉ đứng giữa từ khi có dấu cách ly (vd xī'ān), nên "kěnéng" là kě|néng
// chứ không phải kěn|éng.
function splitSyllables(py, n) {
  let s = '';
  const open = new Set([0]); // vị trí được phép bắt đầu âm tiết a/o/e
  for (const c of py.toLowerCase().normalize('NFC')) {
    if (/[\s'’·…-]/.test(c)) open.add(s.length);
    else s += c;
  }
  const bare = toneless(s);
  const memo = new Map();
  const go = (i, k) => {
    const key = i * 100 + k;
    if (memo.has(key)) return memo.get(key);
    let res = null;
    if (i === bare.length) res = k === 0 ? [] : null;
    else if (k > 0) {
      for (let j = Math.min(bare.length, i + 6); j > i && !res; j--) {
        if (!SYLLABLES.has(bare.slice(i, j))) continue;
        if ('aoe'.includes(bare[i]) && !open.has(i)) continue;
        const rest = go(j, k - 1);
        if (rest) res = [s.slice(i, j), ...rest];
      }
    }
    memo.set(key, res);
    return res;
  };
  return go(0, n);
}

// Mỗi ký tự của câu kèm pinyin (chữ Hán) hoặc chỉ ký tự (dấu câu...).
function sentenceRuby(zh, override, head) {
  const chars = [...zh];
  const syl = override
    ? override.split(/\s+/)
    : pinyin(zh, { type: 'array', toneType: 'symbol', nonZh: 'removed', toneSandhi: false });
  const hanCount = chars.filter((c) => HAN.test(c)).length;
  if (syl.length !== hanCount) throw new Error(`pinyin length mismatch: ${zh}`);
  let i = 0;
  const ruby = chars.map((c) => (HAN.test(c) ? [c, syl[i++]] : [c]));
  // Từ chính trong câu luôn dùng pinyin đã soạn (đúng âm đọc của chữ đa âm).
  if (!override && head.syl) {
    const w = [...head.w];
    for (let p = 0; p + w.length <= ruby.length; p++) {
      if (w.every((c, j) => ruby[p + j][0] === c)) w.forEach((_, j) => (ruby[p + j][1] = head.syl[j]));
    }
  }
  return ruby;
}

const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
const flat = (s) => s.toLowerCase().replace(/[\s'’·…]/g, '').normalize('NFC');

// Nạp mọi từ nhiều chữ đã soạn làm từ điển riêng cho pinyin-pro (giữ thanh nhẹ: péngyou, dōngxi...).
const allContent = Object.fromEntries(Object.keys(levels).map((L) => [L, readContent(L)]));
const dict = {};
const bad = [];
for (const L of Object.keys(allContent)) {
  for (const [w, list] of allContent[L]) {
    const chars = [...w].filter((c) => HAN.test(c));
    for (const e of list) {
      e.syl = splitSyllables(e.py, chars.length);
      if (!e.syl) bad.push(`HSK${L} ${w} ${e.py}`);
      else if (chars.length > 1 && !w.includes('……')) dict[w] = e.syl.join(' ');
    }
  }
}
// Bổ sung: âm cuộn lưỡi (儿化) và cách đọc phổ biến mà pinyin-pro chọn khác.
Object.assign(dict, {
  点儿: 'diǎn r', 一点儿: 'yī diǎn r', 一会儿: 'yī huì r', 这儿: 'zhè r', 那儿: 'nà r',
  哪儿: 'nǎ r', 玩儿: 'wán r', 一块儿: 'yī kuài r', 谁: 'shéi',
});
if (bad.length) console.warn('Không tách được pinyin:', bad.join('; '));
customPinyin(dict);

const report = [];
const summary = [];
for (const L of Object.keys(levels).sort()) {
  const content = allContent[L];
  const seen = new Set();
  const used = new Map();
  const words = [];
  for (const w of levels[L]) {
    if (w === '丢三落四' && seen.has(w)) continue; // mục lặp trong danh sách gốc
    seen.add(w);
    const k = used.get(w) ?? 0;
    used.set(w, k + 1);
    const id = `${L}-${w}${k ? `-${k + 1}` : ''}`; // khoá ổn định để lưu trạng thái học
    const e = content.get(w)?.[k];
    if (!e) {
      words.push({ id, w });
      continue;
    }
    const ruby = sentenceRuby(e.ex.zh, e.ex.pyOverride, { w, syl: e.syl });
    // So pinyin của từ trong câu (tự sinh) với pinyin của từ đã soạn — chỉ để rà soát.
    const idx = e.ex.zh.indexOf(w);
    if (idx >= 0 && !e.ex.pyOverride) {
      const start = [...e.ex.zh.slice(0, idx)].length;
      const got = ruby.slice(start, start + [...w].length).map((r) => r[1] ?? '').join('');
      if (flat(got) !== flat(e.py)) {
        report.push(`HSK${L} ${w}: từ=${e.py} | trong câu=${got} | ${e.ex.zh}`);
      }
    }
    words.push({
      id,
      w: e.w,
      py: e.py,
      hv: e.hv,
      vi: e.vi,
      en: e.en,
      ex: { ruby, vi: e.ex.vi, en: e.ex.en, tag: e.ex.tag },
    });
  }
  const done = words.filter((x) => x.py).length;
  summary.push({ level: Number(L), total: words.length, done });
  writeFileSync(join(out, `hsk${L}.json`), JSON.stringify(words));
}

writeFileSync(join(out, 'index.json'), JSON.stringify({ levels: summary, tags }));
writeFileSync(join(src, 'pinyin_report.txt'), report.join('\n') + '\n');
for (const s of summary) console.log(`HSK${s.level}: ${s.done}/${s.total} từ có dữ liệu`);
console.log(`Pinyin cần rà (khác thanh điệu giữa từ và câu): ${report.length} -> data-src/pinyin_report.txt`);

// Ngữ pháp: data-src/grammar/hsk{L}/NN.json (mỗi file một bài) -> public/data/grammar{L}.json.
// Điểm ngữ pháp: title, py (tuỳ chọn, ghi đè pinyin tiêu đề), uses, cmp.
// Câu ví dụ: 【】 đánh dấu phần ngữ pháp (tô màu), \n tách dòng hội thoại, 字{pinyin} ghi đè âm đọc
// của một chữ; trường py ghi đè pinyin cả câu (âm tiết cách nhau bởi dấu cách, các dòng cách nhau bởi \n).
// Mỗi ký tự ra [chữ, pinyin] hoặc [chữ]; ký tự thuộc phần tô màu có thêm phần tử thứ ba là 1.

// Sửa các chữ đa âm mà pinyin-pro hay đọc sai trong câu (đã rà trên data-src/grammar_pinyin.txt).
const NUMERALS = '一二两三四五六七八九十几';
function fixPolyphones(ruby) {
  const at = (i) => ruby[i]?.[0] ?? '';
  ruby.forEach((r, i) => {
    if (r.length < 2) return;
    const [c] = r;
    if (c === '得' && r[1] === 'dé' && at(i + 1) !== '到' && !'获取值'.includes(at(i - 1)) && at(i - 1) !== '不') {
      r[1] = 'de'; // bổ ngữ trạng thái: 踢得好, 说得很好
    } else if (c === '长' && at(i + 1) === '得') {
      r[1] = 'zhǎng'; // 长得像…, 个子长得快
    } else if (c === '只' && r[1] === 'zhī' && !NUMERALS.includes(at(i - 1))) {
      r[1] = 'zhǐ'; // phó từ "chỉ"; sau số từ mới là lượng từ zhī
    }
  });
  return ruby;
}

function grammarExample(ex, where) {
  const lines = ex.zh.split('\n');
  const pyLines = ex.py?.split('\n');
  if (pyLines && pyLines.length !== lines.length) throw new Error(`${where}: số dòng py khác zh`);
  const viLines = ex.vi.split('\n');
  const enLines = ex.en.split('\n');
  if (viLines.length !== lines.length || enLines.length !== lines.length) {
    throw new Error(`${where}: số dòng vi/en khác zh — ${ex.zh}`);
  }
  const ruby = lines.map((line, i) => {
    const mask = [];
    const hints = new Map(); // vị trí ký tự -> pinyin ghi đè
    let plain = '';
    let on = false;
    const hint = /\{([^}]+)\}/y;
    const chars = [...line];
    for (let p = 0; p < chars.length; p++) {
      const c = chars[p];
      if (c === '【' || c === '】') {
        if ((c === '【') === on) throw new Error(`${where}: 【】 lệch — ${line}`);
        on = c === '【';
        continue;
      }
      if (c === '{') {
        hint.lastIndex = chars.slice(0, p).join('').length;
        const m = hint.exec(line);
        if (!m || !mask.length) throw new Error(`${where}: {pinyin} sai — ${line}`);
        hints.set(mask.length - 1, m[1]);
        p += [...m[0]].length - 1;
        continue;
      }
      plain += c;
      mask.push(on);
    }
    if (on) throw new Error(`${where}: thiếu 】 — ${line}`);
    const base = sentenceRuby(plain, pyLines?.[i], {});
    if (!pyLines) fixPolyphones(base);
    for (const [k, py] of hints) {
      if (base[k].length < 2) throw new Error(`${where}: {pinyin} đặt sau ký tự không phải chữ Hán — ${line}`);
      base[k][1] = py;
    }
    return base.map((r, k) => {
      if (!mask[k]) return r;
      return r.length > 1 ? [...r, 1] : [r[0], '', 1];
    });
  });
  return { ruby, vi: viLines, en: enLines };
}

// Pinyin của tiêu đề điểm ngữ pháp: các chữ Hán liền nhau viết liền (不仅……也 -> bùjǐn……yě),
// giữ nguyên dấu …… và /; ghi đè bằng trường py của điểm ngữ pháp khi cần tách từ.
function titlePinyin(title) {
  const ruby = fixPolyphones(sentenceRuby(title, null, {}));
  return ruby
    .map((r, i) => {
      if (!r[1]) return r[0];
      // Âm tiết a/o/e đứng sau một âm tiết khác cần dấu cách âm: rán'ér, ǒu'ěr.
      const apostrophe = ruby[i - 1]?.[1] && 'aoe'.includes(toneless(r[1])[0]);
      return apostrophe ? `'${r[1]}` : r[1];
    })
    .join('')
    .replace(/（/g, '(')
    .replace(/）/g, ')');
}

const grammarRoot = join(src, 'grammar');
const grammarPinyin = [];
for (const dir of readdirSync(grammarRoot, { withFileTypes: true })) {
  const m = dir.isDirectory() && dir.name.match(/^hsk(\d)$/);
  if (!m) continue;
  const L = m[1];
  const files = readdirSync(join(grammarRoot, dir.name)).filter((f) => f.endsWith('.json')).sort();
  const lessons = [];
  let points = 0;
  for (const f of files) {
    const lesson = JSON.parse(readFileSync(join(grammarRoot, dir.name, f), 'utf8'));
    const uses = (list, where) =>
      list.map((u, i) => ({
        vi: u.vi,
        en: u.en,
        ex: u.ex.map((ex, j) => {
          const out = grammarExample(ex, `${where} cách dùng ${i + 1} ví dụ ${j + 1}`);
          for (const line of out.ruby) {
            grammarPinyin.push(`${where}\t${line.map((r) => r[0]).join('')}\t${line.map((r) => r[1] ?? '').filter(Boolean).join(' ')}`);
          }
          return out;
        }),
      }));
    lessons.push({
      n: lesson.n,
      zh: lesson.zh,
      vi: lesson.vi,
      en: lesson.en,
      points: lesson.points.map((p, k) => {
        const where = `HSK${L} bài ${lesson.n} điểm ${k + 1}`;
        points++;
        return {
          id: `g${L}-${lesson.n}-${k + 1}`, // khoá ổn định để lưu trạng thái học
          title: p.title,
          py: p.py ?? titlePinyin(p.title),
          uses: uses(p.uses, where),
          cmp: p.cmp && { title: p.cmp.title, uses: uses(p.cmp.uses, `${where} so sánh`) },
        };
      }),
    });
  }
  lessons.sort((a, b) => a.n - b.n);
  writeFileSync(join(out, `grammar${L}.json`), JSON.stringify({ level: Number(L), lessons }));
  console.log(`Ngữ pháp HSK${L}: ${lessons.length} bài, ${points} điểm ngữ pháp`);
}
writeFileSync(join(src, 'grammar_pinyin.txt'), grammarPinyin.join('\n') + '\n');
