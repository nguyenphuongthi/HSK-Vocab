// Trạng thái học (0 chưa thuộc, 1 hơi nhớ, 2 đã thuộc) lưu theo tài khoản để đồng bộ giữa các máy.
// Redis hash "hsk:marks:<tài khoản>": field = id của từ (vd "1-爱") hoặc của điểm ngữ pháp
// (vd "g4-1-2": HSK 4, bài 1, điểm 2), value = 1 | 2.
// Không lưu giá trị 0 (mặc định), nên bỏ đánh dấu = xoá field.
import { isAuthed, json } from './_auth.js';
import { redis, redisConfigured, redisTransaction } from './_redis.js';

const ID = /^(?:[1-6]-\S{1,30}|g[1-6]-\d{1,2}-\d{1,2})$/u;
const MAX_CHANGES = 6000; // HSK 1–6 có 4998 từ (+ các điểm ngữ pháp), đủ để đẩy toàn bộ trong lần đồng bộ đầu tiên

const key = () => `hsk:marks:${process.env.AUTH_USERNAME}`;

async function guard(request) {
  if (!(await isAuthed(request))) return json({ error: 'Chưa đăng nhập.' }, 401);
  if (!redisConfigured()) return json({ error: 'Máy chủ chưa có kho lưu trạng thái học.' }, 503);
  return null;
}

export async function GET(request) {
  const denied = await guard(request);
  if (denied) return denied;

  const flat = (await redis(['HGETALL', key()])) || [];
  const marks = {};
  for (let i = 0; i < flat.length; i += 2) marks[flat[i]] = Number(flat[i + 1]);
  return json({ marks });
}

// Body: { changes: { "<id>": 0 | 1 | 2, ... } }
export async function POST(request) {
  const denied = await guard(request);
  if (denied) return denied;

  let changes;
  try {
    ({ changes } = await request.json());
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ.' }, 400);
  }
  if (!changes || typeof changes !== 'object' || Array.isArray(changes)) {
    return json({ error: 'Thiếu danh sách thay đổi.' }, 400);
  }
  const entries = Object.entries(changes);
  if (entries.length > MAX_CHANGES) return json({ error: 'Quá nhiều thay đổi.' }, 400);

  const set = [];
  const del = [];
  for (const [id, v] of entries) {
    if (!ID.test(id) || ![0, 1, 2].includes(v)) return json({ error: `Dữ liệu sai: ${id}` }, 400);
    if (v) set.push(id, String(v));
    else del.push(id);
  }

  const commands = [];
  if (set.length) commands.push(['HSET', key(), ...set]);
  if (del.length) commands.push(['HDEL', key(), ...del]);
  if (commands.length) await redisTransaction(commands);
  return json({ ok: true });
}
