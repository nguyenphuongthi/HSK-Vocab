// Đăng nhập cho một tài khoản duy nhất (không có đăng ký).
// Thông tin đăng nhập lấy từ biến môi trường, không nằm trong mã nguồn:
//   AUTH_USERNAME, AUTH_PASSWORD, SESSION_SECRET (chuỗi ngẫu nhiên dài)
// Phiên đăng nhập là cookie HttpOnly "<hạn>.<chữ ký HMAC>", không cần cơ sở dữ liệu.
// Tệp bắt đầu bằng "_" nên Vercel không biến nó thành một API.

const COOKIE = 'hsk_session';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 ngày (giây)

const enc = new TextEncoder();

export function configured() {
  return Boolean(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD && process.env.SESSION_SECRET);
}

async function hmac(text) {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(process.env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

// So sánh không phụ thuộc vị trí ký tự sai đầu tiên (tránh đoán dần qua thời gian phản hồi).
function sameText(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function checkCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return false;
  // So sánh chữ ký HMAC thay vì chuỗi gốc để độ dài đầu vào không lộ ra.
  const [u, p, eu, ep] = await Promise.all([
    hmac(`u|${username}`),
    hmac(`p|${password}`),
    hmac(`u|${process.env.AUTH_USERNAME}`),
    hmac(`p|${process.env.AUTH_PASSWORD}`),
  ]);
  const okUser = sameText(u, eu);
  const okPass = sameText(p, ep);
  return okUser && okPass;
}

function readCookie(request) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

export async function isAuthed(request) {
  if (!configured()) return false;
  const token = readCookie(request);
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return sameText(sig, await hmac(`s|${process.env.AUTH_USERNAME}|${exp}`));
}

function cookieAttrs(request, maxAge) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export async function sessionCookie(request) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const sig = await hmac(`s|${process.env.AUTH_USERNAME}|${exp}`);
  return `${COOKIE}=${exp}.${sig}; ${cookieAttrs(request, MAX_AGE)}`;
}

export function clearCookie(request) {
  return `${COOKIE}=; ${cookieAttrs(request, 0)}`;
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
