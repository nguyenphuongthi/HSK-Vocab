import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import vercelDev from './scripts/vercel-dev.mjs';

export default defineConfig(({ mode }) => {
  // Nạp tài khoản (AUTH_*, SESSION_SECRET) và kết nối Redis (*REST_API_*, *REDIS_REST_*) từ
  // .env.local cho API giả lập lúc chạy trên máy. Không có tiền tố VITE_ nên các biến này
  // không bao giờ bị đưa vào mã phía trình duyệt.
  const env = loadEnv(mode, process.cwd(), '');
  for (const [k, v] of Object.entries(env)) {
    if (/^(AUTH_|SESSION_SECRET$)|REST_API_|REDIS_REST_/.test(k)) process.env[k] = v;
  }
  return {
    plugins: [react(), vercelDev()],
    base: './',
  };
});
