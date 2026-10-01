import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import WordDetail from './WordDetail.jsx';
import { STATES, countLevel, useMarks } from './marks.js';

// Số cột thực tế của lưới (để chèn khung chi tiết ngay sau hàng chứa từ được chọn).
function useColumns(ref, active) {
  const [cols, setCols] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const measure = () => {
      const n = getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
      setCols(Math.max(1, n));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, active]);
  return cols;
}

export default function LevelSection({ info, tags, words, open, searching, onToggle }) {
  const gridRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState(null); // null = tất cả; 0/1/2 = chỉ trạng thái đó
  const marks = useMarks();
  const counts = countLevel(marks, info.level, info.total);
  const activeFilter = searching ? null : filter;

  // Từ đang mở vẫn được giữ lại dù đổi trạng thái khi đang lọc (đến khi đóng khung chi tiết).
  const shown =
    words && activeFilter !== null
      ? words.filter((x) => (marks[x.id] ?? 0) === activeFilter || x.id === selectedId)
      : words;
  const cols = useColumns(gridRef, open && !!shown && shown.length > 0);
  const selected = shown && selectedId !== null ? shown.findIndex((x) => x.id === selectedId) : -1;

  // Danh sách thay đổi (tìm kiếm) thì bỏ chọn.
  useEffect(() => setSelectedId(null), [words]);

  useEffect(() => {
    if (selectedId === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  if (searching && words && words.length === 0) return null;

  const pickFilter = (value) => {
    setFilter((f) => (f === value ? null : value));
    setSelectedId(null);
    if (!open) onToggle();
  };

  const rowEnd = selected < 0 ? -1 : Math.min(shown.length - 1, Math.floor(selected / cols) * cols + cols - 1);
  const pct = Math.round((info.done / info.total) * 100);

  return (
    <section className={`level ${open ? 'is-open' : ''}`}>
      <div className="level-head" onClick={searching ? undefined : onToggle}>
        <button
          className="level-title"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-expanded={open}
          disabled={searching}
        >
          <span className="level-name">HSK {info.level}</span>
          <span className="level-count">
            {searching && words ? `${words.length} kết quả` : `${info.total.toLocaleString('vi-VN')} từ`}
          </span>
        </button>
        {!searching && (
          <span className="level-stats">
            {STATES.map((st) => (
              <button
                key={st.value}
                className={`stat st-${st.value} ${filter === st.value ? 'is-active' : ''}`}
                aria-pressed={filter === st.value}
                title={filter === st.value ? 'Bỏ lọc' : `Chỉ hiện từ ${st.label.toLowerCase()}`}
                onClick={(e) => {
                  e.stopPropagation();
                  pickFilter(st.value);
                }}
              >
                <b>{counts[st.value].toLocaleString('vi-VN')}</b>
                <span className="stat-label">{st.label.toLowerCase()}</span>
              </button>
            ))}
          </span>
        )}
        {info.done < info.total && !searching && (
          <span className="level-progress" title="Số từ đã có nghĩa và câu ví dụ">
            <span className="bar">
              <span style={{ width: `${pct}%` }} />
            </span>
            {info.done === 0 ? 'đang soạn' : `${pct}%`}
          </span>
        )}
        {!searching && (
          <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </div>

      {open && (
        <div className="level-body">
          {activeFilter !== null && (
            <p className="filter-note">
              <span className={`stat st-${activeFilter}`}>
                Đang lọc: {STATES[activeFilter].label.toLowerCase()}
              </span>
              <button className="link-btn" onClick={() => pickFilter(activeFilter)}>
                Bỏ lọc
              </button>
            </p>
          )}
          {!words && <p className="loading">Đang tải…</p>}
          {shown && shown.length === 0 && <p className="muted">Không có từ nào ở trạng thái này.</p>}
          {shown && shown.length > 0 && (
            <div className="grid" ref={gridRef}>
              {shown.map((x, i) => (
                <Fragment key={x.id}>
                  <button
                    className={`tile st-${marks[x.id] ?? 0} ${selected === i ? 'is-selected' : ''} ${x.py ? '' : 'is-empty'} ${
                      [...x.w].length > 4 ? 'is-long' : ''
                    }`}
                    onClick={() => setSelectedId(selected === i ? null : x.id)}
                    aria-expanded={selected === i}
                    lang="zh-CN"
                  >
                    {x.w}
                  </button>
                  {i === rowEnd && (
                    <WordDetail
                      key={`d-${selectedId}`}
                      entry={shown[selected]}
                      tags={tags}
                      onClose={() => setSelectedId(null)}
                    />
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
