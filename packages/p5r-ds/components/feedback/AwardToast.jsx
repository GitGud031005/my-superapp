import React from 'react';

export function AwardToast({ title, children, icon }) {
  return (
    <div className="p5r-toast" role="status">
      <div className="p5r-toast__shape">
        {icon && <img className="p5r-toast__icon" src={icon} alt="" />}
        <div>
          <div className="p5r-toast__title">{title}</div>
          {children && <div className="p5r-toast__text">{children}</div>}
        </div>
      </div>
    </div>
  );
}
