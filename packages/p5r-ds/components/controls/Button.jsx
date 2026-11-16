import React from 'react';

export function Button({ variant = 'light', size = 'md', type = 'button', className, children, ...rest }) {
  const cls = ['p5r-btn', variant !== 'light' && `p5r-btn--${variant}`, size === 'sm' && 'p5r-btn--sm', className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} {...rest}>
      <span>{children}</span>
    </button>
  );
}
