import { useRef, useState } from 'react';
import { speak, useCanSpeak } from './speech.js';
import { useMarks } from './marks.js';
import StatusSlider from './StatusSlider.jsx';
import { groupPunctuation } from './ruby.js';
import DetailNav, { DetailPager, useDetailCard } from './DetailNav.jsx';

// Đánh dấu vị trí các chữ của từ chính trong câu (hỗ trợ cấu trúc 虽然……但是……).
function headwordMask(ruby, word) {
  const chars = ruby.map((r) => r[0]);
  const mask = new Array(chars.length).fill(false);
  for (const part of word.split('……').filter(Boolean)) {
    const p = [...part];
    for (let i = 0; i + p.length <= chars.length; i++) {
      if (p.every((c, j) => chars[i + j] === c)) p.forEach((_, j) => (mask[i + j] = true));
    }
  }
  return mask;
}

function SpeakButton({ text, label }) {
  const can = useCanSpeak();
  if (!can) return null;
  return (
    <button
      className="icon-btn"
      onClick={(e) => {
        e.stopPropagation();
        speak(text);
      }}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" />
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
      </svg>
    </button>
  );
}

export default function WordDetail({ entry, tags, nav }) {
  const ref = useRef(null);
  const [reveal, setReveal] = useState(false);
  const status = useMarks()[entry.id] ?? 0;

  const enter = useDetailCard(ref, nav);

  if (!entry.py) {
    return (
      <div className={`detail ${enter}`} ref={ref}>
        <div className="detail-head">
          <span className="detail-word" lang="zh-CN">{entry.w}</span>
          <DetailNav noun="Từ" {...nav} />
        </div>
        <div className="reading">
          <StatusSlider id={entry.id} value={status} />
        </div>
        <p className="muted">Từ này đang được soạn nghĩa và câu ví dụ.</p>
        <DetailPager noun="Từ" {...nav} />
      </div>
    );
  }

  const { ex } = entry;
  const sentence = ex.ruby.map((r) => r[0]).join('');
  const mask = headwordMask(ex.ruby, entry.w);
  const tag = tags[ex.tag];

  return (
    <div className={`detail ${enter}`} ref={ref}>
      <div className="detail-head">
        <span className="detail-word" lang="zh-CN">{entry.w}</span>
        <SpeakButton text={entry.w} label="Nghe phát âm từ" />
        <DetailNav noun="Từ" {...nav} />
      </div>

      <div className="reading">
        <span className="pinyin">{entry.py}</span>
        <span className="hanviet" title="Âm Hán Việt">{entry.hv}</span>
        <StatusSlider id={entry.id} value={status} />
      </div>

      <dl className="meaning">
        <div>
          <dt>VI</dt>
          <dd>{entry.vi}</dd>
        </div>
        <div>
          <dt>EN</dt>
          <dd className="en">{entry.en}</dd>
        </div>
      </dl>

      <div
        className={`example ${reveal ? 'is-revealed' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={reveal}
        aria-label={reveal ? 'Ẩn pinyin và bản dịch' : 'Hiện pinyin và bản dịch'}
        onClick={() => setReveal((r) => !r)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
          e.preventDefault();
          setReveal((r) => !r);
        }}
      >
        <div className="example-label">
          Ví dụ
          <SpeakButton text={sentence} label="Nghe câu ví dụ" />
          <svg className="example-chev" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        {reveal ? (
          <p className="sentence with-pinyin" lang="zh-CN">
            {groupPunctuation(ex.ruby).map((g, gi) => (
              <span key={gi} className="grp">
                {g.map(({ c, py, i }) => (
                  <span key={i} className={`rb ${py ? '' : 'punct'} ${mask[i] ? 'hl' : ''}`}>
                    <span className="py">{py || ' '}</span>
                    <span className="hz">{c}</span>
                  </span>
                ))}
              </span>
            ))}
          </p>
        ) : (
          <p className="sentence" lang="zh-CN">
            {ex.ruby.map(([c], i) => (
              <span key={i} className={mask[i] ? 'hl' : ''}>
                {c}
              </span>
            ))}
          </p>
        )}

        {reveal && (
          <div className="translation">
            <p>{ex.vi}</p>
            <p className="en">{ex.en}</p>
            {tag && (
              <p className="tag">
                <span lang="zh-CN">{ex.tag}</span> {tag[0]}
              </p>
            )}
          </div>
        )}
      </div>
      <DetailPager noun="Từ" {...nav} />
    </div>
  );
}
