import { isAuthed, json } from './_auth.js';

export async function GET(request) {
  if (await isAuthed(request)) return json({ user: process.env.AUTH_USERNAME });
  return json({ error: 'Chưa đăng nhập.' }, 401);
}
