import React, { useId, useRef } from 'react';

export function Tabs({ items, value, onChange, label = 'Sections' }) {
  const uid = useId();
  const refs = useRef({});
  // Keep the selected tab and keyboard tab stop in sync when the old tab disappears.
  const current = items.some((i) => i.id === value) ? value : items[0]?.id;
  const select = (target) => {
    onChange(target.id);
    refs.current[target.id]?.focus();
  };
  const move = (e, index) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      select(items[e.key === 'Home' ? 0 : items.length - 1]);
    } else if (step) {
      e.preventDefault();
      select(items[(index + step + items.length) % items.length]);
    }
  };
  return (
    <div className="p5r-tabs" role="tablist" aria-label={label}>
      {items.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => { refs.current[item.id] = el; }}
          role="tab"
          type="button"
          id={item.panelId ? `${item.panelId}-tab` : `${uid}-tab-${i}`}
          aria-selected={item.id === current}
          aria-controls={item.panelId}
          tabIndex={item.id === current ? 0 : -1}
          className="p5r-tab"
          onClick={() => onChange(item.id)}
          onKeyDown={(e) => move(e, i)}
        >
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
