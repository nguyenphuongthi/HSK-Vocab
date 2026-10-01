// Plugin Vite giả lập api/*.js và middleware.js của Vercel khi chạy `vite` / `vite preview` trên máy,
// để đăng nhập hoạt động giống hệt bản deploy.
import middleware, { config } from '../middleware.js';
import * as login from '../api/login.js';
import * as logout from '../api/logout.js';
import * as session from '../api/session.js';

const routes = { '/api/login': login, '/api/logout': logout, '/api/session': session };
const guarded = config.matcher.replace('/:path*', '/');

async function toRequest(req) {
  const chunks = [];
  if (req.method !== 'GET' && req.method !== 'HEAD') for await (const c of req) chunks.push(c);
  return new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: chunks.length ? Buffer.concat(chunks) : undefined,
  });
}

async function send(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((v, k) => k !== 'set-cookie' && res.setHeader(k, v));
  const cookies = response.headers.getSetCookie();
  if (cookies.length) res.setHeader('set-cookie', cookies);
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function handle(req, res, nextFn) {
  try {
    const path = req.url.split('?')[0];
    const mod = routes[path];
    if (mod) {
      const fn = mod[req.method];
      if (!fn) return send(res, new Response(null, { status: 405 }));
      return send(res, await fn(await toRequest(req)));
    }
    if (path.startsWith(guarded)) {
      const r = await middleware(await toRequest(req));
      if (r.headers.get('x-middleware-next')) return nextFn();
      return send(res, r);
    }
    nextFn();
  } catch (e) {
    nextFn(e);
  }
}

export default function vercelDev() {
  return {
    name: 'vercel-dev',
    configureServer: (server) => void server.middlewares.use(handle),
    configurePreviewServer: (server) => void server.middlewares.use(handle),
  };
}
