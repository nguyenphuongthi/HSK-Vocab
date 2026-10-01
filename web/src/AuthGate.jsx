import { useCallback, useEffect, useState } from 'react';
import App from './App.jsx';
import Login from './Login.jsx';

// Hỏi máy chủ xem cookie phiên còn hợp lệ không, rồi hiện trang đăng nhập hoặc trang từ vựng.
export default function AuthGate() {
  const [status, setStatus] = useState('checking'); // checking | out | in

  useEffect(() => {
    fetch('api/session', { cache: 'no-store' })
      .then((r) => setStatus(r.ok ? 'in' : 'out'))
      .catch(() => setStatus('out'));
  }, []);

  const expire = useCallback(() => setStatus('out'), []);

  const logout = async () => {
    try {
      await fetch('api/logout', { method: 'POST' });
    } finally {
      setStatus('out');
    }
  };

  if (status === 'checking') {
    return (
      <div className="login-page">
        <p className="loading">Đang tải…</p>
      </div>
    );
  }
  if (status === 'out') return <Login onSuccess={() => setStatus('in')} />;
  return <App onLogout={logout} onUnauthorized={expire} />;
}
