// Gọi Upstash Redis qua REST API (chỉ dùng fetch, không cần thư viện).
// Vercel Marketplace gắn sẵn URL + token vào biến môi trường; tên biến tuỳ cách tạo kho
// (KV_REST_API_URL, UPSTASH_REDIS_REST_URL hoặc có tiền tố tự đặt), nên dò theo đuôi tên.

function creds() {
  const env = process.env;
  const names = ['KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL', ...Object.keys(env).sort()];
  const urlName = names.find((k) => /(REST_API_URL|REDIS_REST_URL)$/.test(k) && env[k]);
  if (!urlName) return null;
  const token = env[urlName.replace(/URL$/, 'TOKEN')];
  return token ? { url: env[urlName].replace(/\/$/, ''), token } : null;
}

export function redisConfigured() {
  return creds() !== null;
}

async function call(path, body) {
  const { url, token } = creds();
  const r = await fetch(url + path, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || data?.error) throw new Error(`Redis: ${data?.error || r.status}`);
  return data;
}

// Một lệnh, ví dụ ['HGETALL', 'key'] -> kết quả của lệnh.
export async function redis(command) {
  return (await call('', command)).result;
}

// Nhiều lệnh chạy trong một giao dịch (hoặc chạy hết, hoặc không chạy lệnh nào).
export async function redisTransaction(commands) {
  const results = await call('/multi-exec', commands);
  const failed = results.find((x) => x.error);
  if (failed) throw new Error(`Redis: ${failed.error}`);
  return results.map((x) => x.result);
}
