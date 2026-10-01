import { useId, useState } from 'react';

export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const userId = useId();
  const passId = useId();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (r.ok) return onSuccess();
      const d = await r.json().catch(() => ({}));
      setError(d.error || 'Đăng nhập không thành công.');
      setPassword('');
    } catch {
      setError('Không kết nối được máy chủ.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <span className="seal" aria-hidden="true">汉</span>
          <div>
            <h1>Từ vựng HSK</h1>
            <p className="sub">Đăng nhập để tiếp tục</p>
          </div>
        </div>

        <div className="field">
          <label htmlFor={userId}>Tên đăng nhập</label>
          <input
            id={userId}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor={passId}>Mật khẩu</label>
          <div className="pw">
            <input
              id={passId}
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="pw-toggle"
              aria-pressed={show}
              aria-controls={passId}
              onClick={() => setShow((s) => !s)}
            >
              {show ? 'Ẩn' : 'Hiện'}
            </button>
          </div>
        </div>

        {error && (
          <p className="error login-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={busy || !username.trim() || !password}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </form>
    </div>
  );
}
