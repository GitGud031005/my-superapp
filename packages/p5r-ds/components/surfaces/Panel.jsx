import React from 'react';

export function Panel({ tone = 'dark', title, tilt, children, style }) {
  const cls = `p5r-panel p5r-panel--${tone}${tone === 'light' ? ' p5r-light' : ''}${title ? ' p5r-panel--titled' : ''}`;
  return (
    <section className={cls} style={{ ...(tilt != null ? { '--tilt': tilt } : null), ...(title ? { marginTop: 18 } : null), ...style }}>
      {title && <h3 className="p5r-panel__title">{title}</h3>}
      {children}
    </section>
  );
}
