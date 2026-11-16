import React from 'react';

export function TarotCard({ index, back = false, name, height = 320, tilt, onFlip, assetBase = '../../assets' }) {
  const pad = String(index).padStart(2, '0');
  const label = name || `Tarot card ${index}`;
  const Root = onFlip ? 'button' : 'div';
  const rootProps = onFlip ? { type: 'button', onClick: onFlip, 'aria-pressed': back, 'aria-label': `Show the back of ${label}` } : {};
  return (
    <Root className={`p5r-tarot${back ? ' is-back' : ''}`} style={tilt != null ? { '--tilt': tilt } : undefined} {...rootProps}>
      <span className="p5r-tarot__inner" style={{ '--h': `${height}px`, '--ratio': .48 }}>
        <img className="p5r-tarot__face" src={`${assetBase}/tarot/tarot-${pad}.png`} alt={onFlip ? '' : label} aria-hidden={back || undefined} />
        <img className="p5r-tarot__face p5r-tarot__face--back" src={`${assetBase}/tarot/tarot-00.png`} alt="" />
      </span>
    </Root>
  );
}
