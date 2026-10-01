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
function splitSyllables(py, n) {
  const s = py.toLowerCase().normalize('NFC').replace(/[\s'’·…-]/g, '');
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
