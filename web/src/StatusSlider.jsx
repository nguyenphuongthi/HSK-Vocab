import { STATES, setMark } from './marks.js';

// Thanh trượt 3 nấc: đỏ (chưa thuộc) – vàng (hơi nhớ) – xanh (đã thuộc).
export default function StatusSlider({ id, value, label = 'Mức độ thuộc từ' }) {
  const onKey = (e) => {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (e.key === 'Home') setMark(id, 0);
    else if (e.key === 'End') setMark(id, 2);
    else if (step) setMark(id, Math.min(2, Math.max(0, value + step)));
    else return;
    e.preventDefault();
  };

  return (
    <div className="status">
      <div
        className={`status-track st-${value}`}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={2}
        aria-valuenow={value}
        aria-valuetext={STATES[value].label}
        onKeyDown={onKey}
      >
        {STATES.map((s) => (
          <button
            key={s.value}
            type="button"
            tabIndex={-1}
            className="status-stop"
            onClick={() => setMark(id, s.value)}
            aria-label={s.label}
          >
            <span />
          </button>
        ))}
        <span className="status-knob" aria-hidden="true" />
      </div>
      <span className={`status-label st-${value}`}>{STATES[value].label}</span>
    </div>
  );
}
