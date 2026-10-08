import { useState } from 'react';

// Một mục trong bài (课文, 词语搭配, 练习, 扩展): tiêu đề tiếng Trung + phụ đề tiếng Việt, bấm để mở/thu.
export default function Disclosure({ zh, sub, children }) {
  const [open, setOpen] = useState(false);
  return (
    <section className={`panel ${open ? 'is-open' : ''}`}>
      <button type="button" className="panel-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span lang="zh-CN">{zh}</span>
        <span className="panel-sub">{sub}</span>
        <svg className="chev" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && <div className="panel-body">{children}</div>}
    </section>
  );
}
