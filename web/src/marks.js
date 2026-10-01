// Trạng thái học của từng từ: 0 = chưa thuộc (mặc định), 1 = hơi nhớ, 2 = đã thuộc.
// Lưu trong localStorage của trình duyệt (chỉ trên máy người dùng).
import { useSyncExternalStore } from 'react';

const KEY = 'hsk.marks';
export const STATES = [
  { value: 0, label: 'Chưa thuộc' },
  { value: 1, label: 'Hơi nhớ' },
  { value: 2, label: 'Đã thuộc' },
];

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && typeof v === 'object') return v;
  } catch {
    /* bộ nhớ trình duyệt không khả dụng */
  }
  return {};
}

let marks = load();
const listeners = new Set();

export function setMark(id, value) {
  const next = { ...marks };
  if (value) next[id] = value;
  else delete next[id];
  marks = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(marks));
  } catch {
    /* bỏ qua */
  }
  listeners.forEach((l) => l());
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

// Đồng bộ khi người dùng mở web ở nhiều tab.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    marks = load();
    listeners.forEach((l) => l());
  });
}

export function useMarks() {
  return useSyncExternalStore(subscribe, () => marks);
}

// Đếm số từ theo trạng thái trong một cấp: [chưa thuộc, hơi nhớ, đã thuộc].
export function countLevel(marks, level, total) {
  const prefix = `${level}-`;
  const c = [0, 0, 0];
  for (const [id, v] of Object.entries(marks)) if (id.startsWith(prefix)) c[v]++;
  c[0] = total - c[1] - c[2];
  return c;
}
