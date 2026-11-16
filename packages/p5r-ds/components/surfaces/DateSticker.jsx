import React from 'react';

export function DateSticker({ month, day, weekday, period }) {
  return (
    <div className="p5r-date" role="group" aria-label={`${weekday}, ${month}/${day}${period ? `, ${period}` : ''}`}>
      <div className="p5r-date__md" aria-hidden="true">{month}/{day}</div>
      <div className="p5r-date__dow" aria-hidden="true">{weekday}</div>
      {period && <span className="p5r-date__period" aria-hidden="true">{period}</span>}
    </div>
  );
}
