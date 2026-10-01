import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import vercelDev from './scripts/vercel-dev.mjs';

export default defineConfig(({ mode }) => {
  // Nạp AUTH_* / SESSION_SECRET từ .env.local cho API giả lập lúc chạy trên máy.
  // Không có tiền tố VITE_ nên các biến này không bao giờ bị đưa vào mã phía trình duyệt.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ['AUTH_', 'SESSION_']));
  return {
    plugins: [react(), vercelDev()],
    base: './',
  };
});
