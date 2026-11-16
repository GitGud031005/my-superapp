import React, { useId } from 'react';

export function MenuList({ items, value, onChange, onActivate, label = 'Menu' }) {
  const uid = useId();
  const enabled = items.filter((i) => !i.disabled);
  const optionId = (id) => `${uid}-${id}`;
  const isEnabled = (id) => enabled.some((i) => i.id === id);

  // Walks the full list from the current position, so a disabled or missing value still moves sensibly
  const step = (dir) => {
    const n = items.length;
    let i = items.findIndex((x) => x.id === value);
    if (i === -1) i = dir > 0 ? -1 : n;
    for (let k = 0; k < n; k++) {
      i = (i + dir + n) % n;
      if (!items[i].disabled) { onChange(items[i].id); return; }
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Home') { e.preventDefault(); enabled[0] && onChange(enabled[0].id); }
    else if (e.key === 'End') { e.preventDefault(); enabled.length && onChange(enabled[enabled.length - 1].id); }
    else if ((e.key === 'Enter' || e.key === ' ') && isEnabled(value)) { e.preventDefault(); onActivate?.(value); }
  };

  return (
    <ul
      className="p5r-menu"
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={value != null ? optionId(value) : undefined}
      onKeyDown={onKeyDown}
    >
      {items.map((item, i) => (
        <li
          key={item.id}
          id={optionId(item.id)}
          role="option"
          aria-selected={item.id === value}
          aria-disabled={item.disabled || undefined}
          className="p5r-menu__item"
          style={{ '--i': i }}
          onClick={() => { if (item.disabled) return; onChange(item.id); onActivate?.(item.id); }}
        >
          <span>{item.label}</span>
          {item.meta != null && <span className="p5r-menu__meta">{item.meta}</span>}
        </li>
      ))}
    </ul>
  );
}
