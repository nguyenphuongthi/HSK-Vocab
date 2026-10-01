import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LevelSection from './LevelSection.jsx';
import { fold } from './text.js';
import { startSync, useSyncStatus } from './marks.js';

const OPEN_KEY = 'hsk.openLevels';

function loadOpen() {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_KEY));
    if (Array.isArray(v)) return v;
  } catch {
    /* bộ nhớ trình duyệt không khả dụng */
  }
  return [1];
}

function saveOpen(levels) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(levels));
  } catch {
    /* bỏ qua */
  }
}

const UNAUTHORIZED = 'unauthorized';

// Dữ liệu nằm sau middleware đăng nhập: 401 nghĩa là phiên đã hết hạn.
function getJson(url) {
  return fetch(url).then((r) => {
    if (r.status === 401) throw new Error(UNAUTHORIZED);
    if (!r.ok) throw new Error(r.statusText);
    return r.json();
  });
}

export default function App({ onLogout, onUnauthorized }) {
  const [index, setIndex] = useState(null);
  const [error, setError] = useState(null);
  const [words, setWords] = useState({}); // level -> danh sách từ
  const [open, setOpen] = useState(loadOpen);
  const [query, setQuery] = useState('');
  const sync = useSyncStatus();

  useEffect(() => startSync(), []);

  useEffect(() => {
    getJson('data/index.json')
      .then(setIndex)
      .catch((e) => (e.message === UNAUTHORIZED ? onUnauthorized() : setError('Không tải được dữ liệu.')));
  }, [onUnauthorized]);

  const requested = useRef(new Set());
  const loadLevel = useCallback(
    (level) => {
      if (requested.current.has(level)) return;
      requested.current.add(level);
      getJson(`data/hsk${level}.json`)
        .then((list) => setWords((p) => ({ ...p, [level]: list })))
        .catch((e) => {
          requested.current.delete(level);
          if (e.message === UNAUTHORIZED) onUnauthorized();
          else setError(`Không tải được dữ liệu HSK ${level}.`);
        });
    },
    [onUnauthorized],
  );

  const searching = query.trim().length > 0;

  // Tải dữ liệu cho các cấp đang mở; khi tìm kiếm thì tải hết.
  useEffect(() => {
    if (!index) return;
    for (const { level } of index.levels) {
      if (searching || open.includes(level)) loadLevel(level);
    }
  }, [index, open, searching, loadLevel]);

  const toggle = (level) => {
    setOpen((prev) => {
      const next = prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level].sort();
      saveOpen(next);
      return next;
    });
  };

  const q = fold(query.trim());
  const filtered = useMemo(() => {
    if (!q) return words;
    const out = {};
    for (const [level, list] of Object.entries(words)) {
      if (!list) continue;
      out[level] = list.filter(
        (x) =>
          x.w.includes(query.trim()) ||
          (x.py && fold(x.py).replace(/\s/g, '').includes(q.replace(/\s/g, ''))) ||
          (x.hv && fold(x.hv).includes(q)) ||
          (x.vi && fold(x.vi).includes(q)) ||
          (x.en && fold(x.en).includes(q)),
      );
    }
    return out;
  }, [words, q, query]);

  const total = index?.levels.reduce((s, l) => s + l.total, 0) ?? 0;
  const done = index?.levels.reduce((s, l) => s + l.done, 0) ?? 0;

  return (
    <div className="page">
      <header className="masthead">
        <div className="brand">
          <span className="seal" aria-hidden="true">汉</span>
          <div>
            <h1>Từ vựng HSK</h1>
            <p className="sub">
              HSK 1–6 · {total.toLocaleString('vi-VN')} từ
              {index && done < total && <> · đã có nghĩa {done.toLocaleString('vi-VN')} từ</>}
            </p>
          </div>
        </div>
        <div className="head-tools">
          <label className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Tìm chữ Hán, pinyin, Hán Việt, nghĩa…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <button type="button" className="logout" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <p className="hint">Bấm vào một từ để xem nghĩa và câu ví dụ.</p>

      {sync === 'error' && (
        <p className="sync-note" role="status">
          Chưa lưu được trạng thái học lên máy chủ. Thay đổi vẫn giữ trên máy này và sẽ tự gửi lại.
        </p>
      )}
      {sync === 'local' && (
        <p className="sync-note" role="status">
          Máy chủ chưa có kho lưu, trạng thái học tạm thời chỉ lưu trên máy này.
        </p>
      )}

      {error && <p className="error">{error}</p>}
      {!index && !error && <p className="loading">Đang tải…</p>}

      <main>
        {index?.levels.map((info) => (
          <LevelSection
            key={info.level}
            info={info}
            tags={index.tags}
            words={filtered[info.level]}
            open={searching || open.includes(info.level)}
            searching={searching}
            onToggle={() => toggle(info.level)}
          />
        ))}
      </main>

      <footer className="foot">
        Danh sách từ theo đề cương HSK (mock.tangce.cn). Pinyin đối chiếu với CC-CEDICT (CC BY-SA 4.0).
      </footer>
    </div>
  );
}
