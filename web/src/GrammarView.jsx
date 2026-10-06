import { useEffect, useState } from 'react';
import GrammarDetail from './GrammarDetail.jsx';
import { STATES, countIds, useMarks } from './marks.js';
import { UNAUTHORIZED, getJson } from './api.js';

const OPEN_KEY = 'hsk.grammar.openLessons';

function loadOpen() {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_KEY));
    if (Array.isArray(v)) return v;
  } catch {
    /* bộ nhớ trình duyệt không khả dụng */
  }
  return [1];
}

function saveOpen(lessons) {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify(lessons));
  } catch {
    /* bỏ qua */
  }
}

// Giữ dữ liệu đã tải khi chuyển qua lại giữa các tab.
const cache = {};

function LessonSection({ lesson, open, onToggle }) {
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState(null); // null = tất cả; 0/1/2 = chỉ trạng thái đó
  const marks = useMarks();
  const points = lesson.points.map((p, i) => ({ ...p, num: i + 1 }));
  const counts = countIds(
    marks,
    points.map((p) => p.id),
  );
  // Điểm đang mở vẫn được giữ lại dù đổi trạng thái khi đang lọc (đến khi đóng).
  const shown =
    filter === null ? points : points.filter((p) => (marks[p.id] ?? 0) === filter || p.id === selectedId);

  useEffect(() => {
    if (selectedId === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const pickFilter = (value) => {
    setFilter((f) => (f === value ? null : value));
    setSelectedId(null);
    if (!open) onToggle();
  };

  return (
    <section className={`level lesson ${open ? 'is-open' : ''}`}>
      <div className="level-head" onClick={onToggle}>
        <button
          className="level-title"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={open}
        >
          <span className="level-name">Bài {lesson.n}</span>
          <span className="lesson-name">
            <span className="lesson-zh" lang="zh-CN">
              {lesson.zh}
            </span>
            <span className="level-count">{lesson.vi}</span>
          </span>
        </button>
        <span className="level-stats">
          {STATES.map((st) => (
            <button
              key={st.value}
              className={`stat st-${st.value} ${filter === st.value ? 'is-active' : ''}`}
              aria-pressed={filter === st.value}
              title={filter === st.value ? 'Bỏ lọc' : `Chỉ hiện điểm ngữ pháp ${st.label.toLowerCase()}`}
              onClick={(e) => {
                e.stopPropagation();
                pickFilter(st.value);
              }}
            >
              <b>{counts[st.value]}</b>
              <span className="stat-label">{st.label.toLowerCase()}</span>
            </button>
          ))}
        </span>
        <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div className="level-body">
          {filter !== null && (
            <p className="filter-note">
              <span className={`stat st-${filter}`}>Đang lọc: {STATES[filter].label.toLowerCase()}</span>
              <button className="link-btn" onClick={() => pickFilter(filter)}>
                Bỏ lọc
              </button>
            </p>
          )}
          {shown.length === 0 && <p className="muted">Không có điểm ngữ pháp nào ở trạng thái này.</p>}
          <ul className="points">
            {shown.map((p) => {
              const selected = p.id === selectedId;
              return (
                <li key={p.id}>
                  <button
                    className={`point st-${marks[p.id] ?? 0} ${selected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(selected ? null : p.id)}
                    aria-expanded={selected}
                  >
                    <span className="g-num">{p.num}</span>
                    <span className="point-title" lang="zh-CN">
                      {p.title}
                    </span>
                    {p.cmp && <span className="point-tag">So sánh</span>}
                  </button>
                  {selected && (
                    <GrammarDetail key={p.id} point={p} num={p.num} onClose={() => setSelectedId(null)} />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export default function GrammarView({ level, onUnauthorized }) {
  const [data, setData] = useState(cache[level] ?? null);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(loadOpen);

  useEffect(() => {
    if (cache[level]) return;
    getJson(`data/grammar${level}.json`)
      .then((d) => {
        cache[level] = d;
        setData(d);
      })
      .catch((e) =>
        e.message === UNAUTHORIZED ? onUnauthorized() : setError('Không tải được dữ liệu ngữ pháp.'),
      );
  }, [level, onUnauthorized]);

  const toggle = (n) => {
    setOpen((prev) => {
      const next = prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n].sort((a, b) => a - b);
      saveOpen(next);
      return next;
    });
  };

  return (
    <>
      <p className="hint">
        Bấm vào một điểm ngữ pháp để xem giải thích. Bấm vào câu ví dụ để hiện pinyin và bản dịch.
      </p>
      {error && <p className="error">{error}</p>}
      {!data && !error && <p className="loading">Đang tải…</p>}
      <main>
        {data?.lessons.map((lesson) => (
          <LessonSection
            key={lesson.n}
            lesson={lesson}
            open={open.includes(lesson.n)}
            onToggle={() => toggle(lesson.n)}
          />
        ))}
      </main>
      <footer className="foot">
        Ngữ pháp theo giáo trình Chuẩn HSK 4 (上, 下), bài 1–20. Bản dịch tiếng Anh và bản dịch câu ví dụ được
        soạn thêm.
      </footer>
    </>
  );
}
