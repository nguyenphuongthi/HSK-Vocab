// Vercel Routing Middleware: chặn dữ liệu từ vựng nếu chưa đăng nhập.
// Giao diện (index.html, assets/) vẫn tải được để hiện trang đăng nhập, nhưng không chứa dữ liệu.
import { next } from '@vercel/functions';
import { isAuthed, json } from './api/_auth.js';

export const config = { matcher: '/data/:path*' };

export default async function middleware(request) {
  if (await isAuthed(request)) return next();
  return json({ error: 'Chưa đăng nhập.' }, 401);
}
