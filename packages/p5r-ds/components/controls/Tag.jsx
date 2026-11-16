import React from 'react';

export function Tag({ tone = 'red', children }) {
  return <span className={`p5r-tag p5r-tag--${tone}`}><span>{children}</span></span>;
}
