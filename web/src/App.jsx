import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import LevelSection from './LevelSection.jsx';
import GrammarView from './GrammarView.jsx';
import { fold } from './text.js';
import { startSync, useSyncStatus } from './marks.js';
import { UNAUTHORIZED, getJson } from './api.js';

const OPEN_KEY = 'hsk.openLevels';
const TAB_KEY = 'hsk.tab';

// Các tab trên đầu trang: từ vựng HSK 1–6 và ngữ pháp theo giáo trình.
const TABS = [
  { id: 'vocab', label: 'Từ vựng', title: 'Từ vựng HSK' },
  { id: 'grammar4', label: 'HSK 4', title: 'Ngữ pháp HSK 4', level: 4, sub: 'Giáo trình Chuẩn HSK 4 (上, 下) · bài 1–20' },
  { id: 'grammar5', label: 'HSK 5', title: 'Ngữ pháp HSK 5', level: 5, sub: 'Giáo trình Chuẩn HSK 5 (上) · bài 1–18' },
];

function loadTab() {
  try {
    const v = localStorage.getItem(TAB_KEY);
    if (TABS.some((t) => t.id === v)) return v;
  } catch {
    /* bộ nhớ trình duyệt không khả dụng */
  }
  return 'vocab';
}

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

export default function App({ onLogout, onUnauthorized }) {
  const [index, setIndex] = useState(null);
  const [error, setError] = useState(null);
  const [words, setWords] = useState({}); // level -> danh sách từ
  const [open, setOpen] = useState(loadOpen);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState(loadTab);
  const headerRef = useRef(null);
  const sync = useSyncStatus();
  const current = TABS.find((t) => t.id === tab);
  const isVocab = tab === 'vocab';

  useEffect(() => startSync(), []);

  useEffect(() => {
    document.title = current.title;
  }, [current]);

  const pickTab = (id) => {
    setTab(id);
    // Đang cuộn ở giữa trang thì đưa về đầu nội dung của tab mới (ngay dưới đầu trang).
    const top = headerRef.current.getBoundingClientRect().bottom + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top });
    try {
      localStorage.setItem(TAB_KEY, id);
    } catch {
      /* bỏ qua */
    }
  };

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
      <header className="masthead" ref={headerRef}>
        <div className="brand">
          <span className="seal" aria-hidden="true">汉</span>
          <div>
            <h1>{current.title}</h1>
            {isVocab ? (
              <p className="sub">
                HSK 1–6 · {total.toLocaleString('vi-VN')} từ
                {index && done < total && <> · đã có nghĩa {done.toLocaleString('vi-VN')} từ</>}
              </p>
            ) : (
              <p className="sub">{current.sub}</p>
            )}
          </div>
        </div>
        <div className={`head-tools ${isVocab ? '' : 'is-compact'}`}>
          {isVocab && (
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
          )}
          <button type="button" className="logout" onClick={onLogout}>
            Đăng xuất
          </button>
        </div>
      </header>

      <nav className="tabs" role="tablist" aria-label="Nội dung">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={t.id === tab}
            onClick={() => pickTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

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

      {isVocab ? (
        <>
          <p className="hint">Bấm vào một từ để xem nghĩa và câu ví dụ.</p>
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
        </>
      ) : (
        <GrammarView key={current.id} level={current.level} onUnauthorized={onUnauthorized} />
      )}
    </div>
  );
}
