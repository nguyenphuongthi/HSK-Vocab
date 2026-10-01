import { clearCookie, json } from './_auth.js';

export function POST(request) {
  return json({ ok: true }, 200, { 'set-cookie': clearCookie(request) });
}
