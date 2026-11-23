import React, { useState } from 'react';
import { RansomTitle } from './RansomTitle';

export function CallingCard({
  to, body, signature = 'The Phantom Thieves of Hearts', flipped = false, onFlip, seed = 0, tilted = true,
  assetBase = '../../assets',
}) {
  const logo = assetBase == null ? null : `${assetBase}/brand/phantom-thieves-logo.png`;
  const [failedLogo, setFailedLogo] = useState(null);
  const mark = logo && logo !== failedLogo
    ? <img className="p5r-card__logo" src={logo} alt="" onError={() => setFailedLogo(logo)} />
    : <span className="p5r-card__logo p5r-card__logo--fallback" aria-hidden="true" />;
  const Root = onFlip ? 'button' : 'div';
  const rootProps = onFlip ? { type: 'button', onClick: onFlip, 'aria-pressed': flipped, 'aria-label': 'Show the logo side' } : { 'aria-hidden': true };
  return (
    <div className="p5r-card-wrap" style={tilted ? undefined : { '--tilt': '0deg' }}>
      <p className="p5r-sr-only">Calling card. {to} {body} {signature}</p>
      <Root className={`p5r-card${flipped ? ' is-flipped' : ''}`} {...rootProps}>
        <span className="p5r-card__face p5r-card__front">
          <span className="p5r-card__front-inner">
            <span className="p5r-card__corner">
              {mark}
              <RansomTitle text="Take your heart" skin="logo" fit maxSize={30} singleLine flipCase={false} jitter={.15} tilt={3} seed={seed + 1} delay={150} duration={250} />
            </span>
            <RansomTitle text={to} fit maxSize={90} jitter={.45} tilt={6} seed={seed + 2} delay={300} duration={450} />
            <span className="p5r-card__body">{body}</span>
            <span className="p5r-card__sig">
              <RansomTitle text={signature} fit maxSize={34} singleLine align="end" jitter={.2} tilt={4} seed={seed + 4} delay={1500} duration={350} />
            </span>
          </span>
        </span>
        <span className="p5r-card__face p5r-card__back">
          <span className="p5r-card__back-inner">
            {mark}
            <RansomTitle text="Take your heart" skin="logo" fit maxSize={120} singleLine flipCase={false} jitter={.2} tilt={3} seed={seed + 5} duration={400} />
          </span>
        </span>
      </Root>
    </div>
  );
}
