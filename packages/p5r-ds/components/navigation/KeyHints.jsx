import React from 'react';

export function KeyHints({ items, label = 'Keyboard shortcuts' }) {
  return (
    <ul className="p5r-key-hints" role="list" aria-label={label}>
      {items.map(({ keys, action }) => (
        <li key={action}><kbd>{keys}</kbd><span>{action}</span></li>
      ))}
    </ul>
  );
}
