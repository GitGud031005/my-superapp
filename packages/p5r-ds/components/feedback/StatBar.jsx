import React from 'react';

export function StatBar({ label, value, max, kind = 'hp' }) {
  const top = max > 0 ? max : 1;
  const now = Math.max(0, Math.min(top, value));
  return (
    <div
      className={`p5r-stat p5r-stat--${kind}`}
      role="meter"
      aria-label={label}
      aria-valuenow={now}
      aria-valuemin={0}
      aria-valuemax={top}
      aria-valuetext={`${value} of ${max}`}
    >
      <span className="p5r-stat__label" aria-hidden="true">{label}</span>
      <div className="p5r-stat__track" aria-hidden="true"><div className="p5r-stat__fill" style={{ '--pct': `${(now / top) * 100}%` }} /></div>
      <span className="p5r-stat__num" aria-hidden="true">{value}/{max}</span>
    </div>
  );
}
