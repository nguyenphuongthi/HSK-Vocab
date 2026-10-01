import { checkCredentials, configured, json, sessionCookie } from './_auth.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(request) {
  if (!configured()) return json({ error: 'Máy chủ chưa cấu hình tài khoản.' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Yêu cầu không hợp lệ.' }, 400);
  }

  if (!(await checkCredentials(body?.username, body?.password))) {
    await wait(800); // làm chậm việc thử mật khẩu liên tục
    return json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' }, 401);
  }

  return json({ user: process.env.AUTH_USERNAME }, 200, { 'set-cookie': await sessionCookie(request) });
}
