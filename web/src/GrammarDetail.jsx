import { useEffect, useRef, useState } from 'react';
import { useMarks } from './marks.js';
import StatusSlider from './StatusSlider.jsx';
import { groupPunctuation } from './ruby.js';

// Gộp các chữ liền nhau cùng trạng thái tô màu để phần ngữ pháp được tô thành một khối.
function runs(line) {
  const out = [];
  for (const [c, , hl] of line) {
    const last = out[out.length - 1];
    if (last && last.hl === !!hl) last.text += c;
    else out.push({ hl: !!hl, text: c });
  }
  return out;
}

// Một câu ví dụ: mặc định chỉ hiện chữ Hán; bấm để hiện pinyin và bản dịch VI/EN.
function Example({ ex, revealed, onToggle }) {
  return (
    <div
      className={`example g-example ${revealed ? 'is-revealed' : ''}`}
      role="button"
      tabIndex={0}
      aria-expanded={revealed}
      aria-label={revealed ? 'Ẩn pinyin và bản dịch' : 'Hiện pinyin và bản dịch'}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault();
        onToggle();
      }}
    >
      <div className="g-example-body">
        {ex.ruby.map((line, li) =>
          revealed ? (
            <p key={li} className="sentence with-pinyin" lang="zh-CN">
              {groupPunctuation(line).map((g, gi) => (
                <span key={gi} className="grp">
                  {g.map(({ c, py, i }) => (
                    <span key={i} className={`rb ${py ? '' : 'punct'} ${line[i][2] ? 'hl' : ''}`}>
                      <span className="py">{py || ' '}</span>
                      <span className="hz">{c}</span>
                    </span>
                  ))}
                </span>
              ))}
            </p>
          ) : (
            <p key={li} className="sentence" lang="zh-CN">
              {runs(line).map((r, i) => (
                <span key={i} className={r.hl ? 'hl' : undefined}>
                  {r.text}
                </span>
              ))}
            </p>
          ),
        )}
        {revealed && (
          <div className="translation">
            {ex.vi.map((t, i) => (
              <p key={`vi${i}`}>{t}</p>
            ))}
            {ex.en.map((t, i) => (
              <p key={`en${i}`} className="en">
                {t}
              </p>
            ))}
          </div>
        )}
      </div>
      <svg className="example-chev" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

// Trong mục So sánh, phần đầu "Giống nhau:", "Khác nhau 1:"… được in đậm.
function Explain({ text, labeled }) {
  const m = labeled && text.match(/^([^:：]{1,24}):\s*/);
  if (!m) return text;
  return (
    <>
      <b>{m[1]}:</b> {text.slice(m[0].length)}
    </>
  );
}

function Uses({ uses, prefix, labeled, revealed, toggle }) {
  return uses.map((u, i) => (
    <div className="use" key={i}>
      {!labeled && uses.length > 1 && <div className="use-label">Cách dùng {i + 1}</div>}
      <dl className="meaning">
        <div>
          <dt>VI</dt>
          <dd>
            <Explain text={u.vi} labeled={labeled} />
          </dd>
        </div>
        <div>
          <dt>EN</dt>
          <dd className="en">
            <Explain text={u.en} labeled={labeled} />
          </dd>
        </div>
      </dl>
      <div className="g-examples">
        {u.ex.map((ex, j) => {
          const key = `${prefix}${i}-${j}`;
          return <Example key={key} ex={ex} revealed={revealed.has(key)} onToggle={() => toggle(key)} />;
        })}
      </div>
    </div>
  ));
}

export default function GrammarDetail({ point, num, onClose }) {
  const ref = useRef(null);
  const status = useMarks()[point.id] ?? 0;
  const [revealed, setRevealed] = useState(() => new Set());

  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const allKeys = [
    ...point.uses.flatMap((u, i) => u.ex.map((_, j) => `u${i}-${j}`)),
    ...(point.cmp?.uses.flatMap((u, i) => u.ex.map((_, j) => `c${i}-${j}`)) ?? []),
  ];
  const allShown = allKeys.every((k) => revealed.has(k));

  const toggle = (key) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="detail g-detail" ref={ref}>
      <div className="detail-head">
        <span className="g-num">{num}</span>
        <span className="g-title" lang="zh-CN">
          {point.title}
        </span>
        <button className="icon-btn close" onClick={onClose} aria-label="Đóng">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="reading g-tools">
        <span className="pinyin">{point.py}</span>
        <StatusSlider id={point.id} value={status} label="Mức độ thuộc điểm ngữ pháp" />
        <button
          type="button"
          className="link-btn"
          onClick={() => setRevealed(allShown ? new Set() : new Set(allKeys))}
        >
          {allShown ? 'Ẩn hết pinyin và bản dịch' : 'Hiện hết pinyin và bản dịch'}
        </button>
      </div>

      <Uses uses={point.uses} prefix="u" revealed={revealed} toggle={toggle} />

      {point.cmp && (
        <section className="compare">
          <h3>
            So sánh <span lang="zh-CN">{point.cmp.title}</span>
          </h3>
          <Uses uses={point.cmp.uses} prefix="c" labeled revealed={revealed} toggle={toggle} />
        </section>
      )}
    </div>
  );
}
