export const UNAUTHORIZED = 'unauthorized';

// Dữ liệu nằm sau middleware đăng nhập: 401 nghĩa là phiên đã hết hạn.
export function getJson(url) {
  return fetch(url).then((r) => {
    if (r.status === 401) throw new Error(UNAUTHORIZED);
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });
}
