import React from 'react';

export function Banner({ tone = 'red', tilt, as: Tag = 'div', children }) {
  return (
    <Tag className={`p5r-banner p5r-banner--${tone}`} style={tilt != null ? { '--tilt': tilt } : undefined}>
      <span className="p5r-banner__shape" style={{ display: 'inline-block' }}>{children}</span>
    </Tag>
  );
}
