// Trạng thái học của từng từ: 0 = chưa thuộc (mặc định), 1 = hơi nhớ, 2 = đã thuộc.
// Lưu theo tài khoản trên máy chủ (api/marks) để đồng bộ giữa các máy; localStorage giữ
// bản sao để hiện ngay khi mở web và giữ các thay đổi chưa gửi được (mất mạng, lỗi máy chủ).
import { useSyncExternalStore } from 'react';

const KEY = 'hsk.marks';
const PENDING_KEY = 'hsk.marks.pending'; // id -> giá trị mới, chưa lưu được lên máy chủ
const SYNCED_KEY = 'hsk.marks.synced'; // máy này đã từng đồng bộ với máy chủ chưa
const SAVE_DELAY = 500; // ms: gom các lần bấm liên tiếp thành một lần gửi

export const STATES = [
  { value: 0, label: 'Chưa thuộc' },
  { value: 1, label: 'Hơi nhớ' },
  { value: 2, label: 'Đã thuộc' },
];

function load(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    if (v && typeof v === 'object') return v;
  } catch {
    /* bộ nhớ trình duyệt không khả dụng */
  }
  return {};
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bỏ qua */
  }
}

let marks = load(KEY);
let pending = load(PENDING_KEY);
// ok | saving | error | local (máy chủ chưa có kho lưu) | unknown (chưa hỏi máy chủ)
let status = 'unknown';
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

function setStatus(s) {
  if (s === status) return;
  status = s;
  notify();
}

function apply(base, changes) {
  const next = { ...base };
  for (const [id, v] of Object.entries(changes)) {
    if (v) next[id] = v;
    else delete next[id];
  }
  return next;
}

export function setMark(id, value) {
  marks = apply(marks, { [id]: value });
  pending = { ...pending, [id]: value };
  save(KEY, marks);
  save(PENDING_KEY, pending);
  notify();
  scheduleFlush();
}

async function api(method, body) {
  const r = await fetch('api/marks', {
    method,
    cache: 'no-store',
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
  return r.json();
}

const failStatus = (e) => (e.status === 503 ? 'local' : 'error');

let timer = null;
function scheduleFlush() {
  clearTimeout(timer);
  timer = setTimeout(flush, SAVE_DELAY);
}

let flushing = false;
async function flush() {
  if (flushing || status === 'local' || !Object.keys(pending).length) return;
  flushing = true;
  const batch = pending;
  setStatus('saving');
  try {
    await api('POST', { changes: batch });
    // Chỉ bỏ những thay đổi đã gửi; từ nào vừa bấm tiếp trong lúc gửi thì giữ lại.
    const rest = {};
    for (const [id, v] of Object.entries(pending)) if (batch[id] !== v) rest[id] = v;
    pending = rest;
    save(PENDING_KEY, pending);
    setStatus('ok');
  } catch (e) {
    setStatus(failStatus(e));
  } finally {
    flushing = false;
  }
  if (status === 'ok' && Object.keys(pending).length) flush();
}

// Lấy trạng thái từ máy chủ (máy chủ là bản chuẩn), rồi đè các thay đổi chưa gửi của máy này lên.
async function pull() {
  try {
    const { marks: server } = await api('GET');
    let synced = false;
    try {
      synced = localStorage.getItem(SYNCED_KEY) === '1';
    } catch {
      /* bỏ qua */
    }
    // Lần đầu máy này đồng bộ mà máy chủ còn trống: đẩy trạng thái đang có trên máy lên.
    if (!synced && !Object.keys(server).length) pending = { ...marks, ...pending };
    marks = apply(server, pending);
    save(KEY, marks);
    save(PENDING_KEY, pending);
    try {
      localStorage.setItem(SYNCED_KEY, '1');
    } catch {
      /* bỏ qua */
    }
    status = 'ok';
    notify();
    flush();
  } catch (e) {
    setStatus(failStatus(e));
  }
}

// Gọi khi đã đăng nhập. Đồng bộ lại mỗi khi quay lại tab (để thấy thay đổi từ máy khác)
// và khi có mạng trở lại. Trả về hàm huỷ.
export function startSync() {
  const onVisible = () => document.visibilityState === 'visible' && pull();
  const onOnline = () => pull();
  pull();
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', onOnline);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('online', onOnline);
  };
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Đồng bộ khi người dùng mở web ở nhiều tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) marks = load(KEY);
    else if (e.key === PENDING_KEY) pending = load(PENDING_KEY);
    else return;
    notify();
  });
}

export function useMarks() {
  return useSyncExternalStore(subscribe, () => marks);
}

export function useSyncStatus() {
  return useSyncExternalStore(subscribe, () => status);
}

// Đếm số từ theo trạng thái trong một cấp: [chưa thuộc, hơi nhớ, đã thuộc].
export function countLevel(marks, level, total) {
  const prefix = `${level}-`;
  const c = [0, 0, 0];
  for (const [id, v] of Object.entries(marks)) if (id.startsWith(prefix)) c[v]++;
  c[0] = total - c[1] - c[2];
  return c;
}
