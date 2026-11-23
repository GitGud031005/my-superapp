import React, { useState } from 'react';

export function TarotCard({ index, back = false, name, height = 320, tilt, onFlip, assetBase = '../../assets' }) {
  const pad = String(index).padStart(2, '0');
  const label = name || `Tarot card ${index}`;
  const [failedFaces, setFailedFaces] = useState({});
  const Root = onFlip ? 'button' : 'div';
  const rootProps = onFlip ? { type: 'button', onClick: onFlip, 'aria-pressed': back, 'aria-label': `Show the back of ${label}` } : {};
  return (
    <Root className={`p5r-tarot${back ? ' is-back' : ''}`} style={tilt != null ? { '--tilt': tilt } : undefined} {...rootProps}>
      <span className="p5r-tarot__inner" style={{ '--h': `${height}px`, '--ratio': .48 }}>
        {['front', 'back'].map((side) => {
          const isBack = side === 'back';
          const src = assetBase == null ? null : `${assetBase}/tarot/tarot-${isBack ? '00' : pad}.png`;
          const className = `p5r-tarot__face${isBack ? ' p5r-tarot__face--back' : ''}`;
          const alt = onFlip || isBack ? '' : label;
          if (src && failedFaces[side] !== src) {
            return <img key={side} className={className} src={src} alt={alt} aria-hidden={isBack || back || undefined}
              onError={() => setFailedFaces((previous) => ({ ...previous, [side]: src }))} />;
          }
          return (
            <span key={side} className={`${className} p5r-tarot__fallback`} role={alt ? 'img' : undefined}
              aria-label={alt || undefined} aria-hidden={!alt || back || undefined}>
              <span className="p5r-tarot__number">{isBack ? '◆' : pad}</span>
              {!isBack && <span>{label}</span>}
            </span>
          );
        })}
      </span>
    </Root>
  );
}
