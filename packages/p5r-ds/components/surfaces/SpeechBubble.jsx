import React from 'react';

export function SpeechBubble({ speaker, tailX = 50, children }) {
  const t = Math.max(12, Math.min(88, tailX));
  const clip = `polygon(0 0,100% 0,100% 78%,${t + 14}% 78%,${t}% 100%,${t - 6}% 78%,0 78%)`;
  return (
    <div className="p5r-bubble" style={{ '--bubble-clip': clip }}>
      {speaker && <span className="p5r-bubble__name">{speaker}</span>}
      <div className="p5r-bubble__edge">
        <div className="p5r-bubble__body">{children}</div>
      </div>
    </div>
  );
}
