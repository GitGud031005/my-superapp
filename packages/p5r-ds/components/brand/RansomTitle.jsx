import React, { useLayoutEffect, useMemo, useRef } from 'react';

const FONTS = [
  { ff: 'var(--font-ransom-1)' },
  { ff: 'var(--font-ransom-2)' },
  { ff: 'var(--font-ransom-3)', s: .92 },
  { ff: 'var(--font-ransom-4)', fw: 700, s: .95 },
  { ff: 'var(--font-ransom-5)' },
  { ff: 'var(--font-ransom-6)', fw: 800 },
  { ff: 'var(--font-ransom-7)', s: .8 },
];

const SKINS = {
  message: [
    { bg: 'var(--white)', fg: 'var(--black)', w: 7 },
    { bg: 'var(--black)', fg: 'var(--white)', w: 3 },
    { bg: 'var(--paper)', fg: 'var(--black)', w: 2 },
    { bg: 'var(--white)', fg: 'var(--red-600)', w: 1 },
  ],
  logo: [
    { bg: 'var(--white)', fg: 'var(--black)', w: 6 },
    { bg: 'var(--black)', fg: 'var(--white)', w: 1 },
  ],
};

const MIN_READABLE = 14;
// Breaking a word mid-way looks rough, so only do it for a clearly larger result
const BREAK_GAIN = 1.3;

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter() : null;
const graphemes = (s) => (segmenter ? Array.from(segmenter.segment(s), (g) => g.segment) : [...s]);

function hash(s) {
  let h = 2166136261;
  for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weighted(list, rng) {
  let r = rng() * list.reduce((sum, x) => sum + x.w, 0);
  return list.find((x) => (r -= x.w) < 0) ?? list[0];
}

function cutEdges(rng) {
  const j = (a) => Math.round(rng() * a * 10) / 10;
  return `polygon(${j(4)}% ${j(6)}%, ${100 - j(4)}% ${j(6)}%, ${100 - j(4)}% ${100 - j(6)}%, ${j(4)}% ${100 - j(6)}%)`;
}

function buildWords(text, seed, { skins, flipCase, jitter, tilt }) {
  const rng = mulberry32(hash(text) + seed * 7919);
  return text.trim().split(/\s+/).filter(Boolean).map((word) =>
    graphemes(word).map((raw) => {
      let ch = raw;
      const font = FONTS[Math.floor(rng() * FONTS.length)];
      const skin = weighted(skins, rng);
      if (flipCase && /\p{L}/u.test(ch) && rng() < .35) ch = ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase();
      const size = (font.s ?? 1) * (/[\p{L}\p{N}]/u.test(ch) ? 1 - jitter / 2 + rng() * jitter : .8);
      return {
        ch,
        style: {
          '--bg': skin.bg, '--fg': skin.fg,
          '--ff': font.ff, '--fw': font.fw ?? 400, '--fi': font.fi ?? 'normal',
          '--s': size.toFixed(3),
          '--rot': `${(rng() * tilt * 2 - tilt).toFixed(1)}deg`,
          '--dy': `${(rng() * .12 - .06).toFixed(3)}em`,
          '--clip': cutEdges(rng),
        },
      };
    }),
  );
}

export function RansomTitle({
  text, seed = 0, as: Root = 'span', skin = 'message', size = 32, fit = false, maxSize = 96,
  singleLine = false, align = 'center', flipCase = skin === 'message', jitter = .22, tilt = 4, delay = 0, duration = 600,
}) {
  const boxRef = useRef(null);
  const tilesRef = useRef(null);
  const words = useMemo(
    () => buildWords(text, seed, { skins: SKINS[skin], flipCase, jitter, tilt }),
    [text, seed, skin, flipCase, jitter, tilt],
  );
  const total = words.reduce((n, w) => n + w.length, 0);
  const step = Math.min(30, duration / Math.max(total, 1));
  // A single line cannot wrap, so it always shrinks to fit, capped at `size` when fit is off
  const shrink = fit || singleLine;
  const ceiling = fit ? maxSize : size;
  const cls = ['p5r-ransom', singleLine && 'p5r-ransom--line', !shrink && 'p5r-ransom--free', align === 'end' && 'p5r-ransom--end'].filter(Boolean).join(' ');

  useLayoutEffect(() => {
    const box = boxRef.current;
    const tiles = tilesRef.current;
    if (!shrink || !box || !tiles) return undefined;
    // offsetWidth, not scrollWidth: scrollWidth counts the entry animation's scale as overflow
    const overflows = (breakWords) => {
      if (tiles.offsetHeight > box.clientHeight) return true;
      if (breakWords) return false;
      const widths = Array.from(tiles.children, (w) => {
        const cs = getComputedStyle(w);
        return w.offsetWidth * 1.08 + parseFloat(cs.marginLeft) + parseFloat(cs.marginRight);
      });
      const needed = singleLine ? widths.reduce((a, b) => a + b, 0) : Math.max(0, ...widths);
      return needed > box.clientWidth;
    };
    const search = (breakWords) => {
      let lo = 4;
      let hi = ceiling;
      while (hi - lo > .5) {
        const mid = (lo + hi) / 2;
        box.style.setProperty('--fs', `${mid}px`);
        if (overflows(breakWords)) hi = mid; else lo = mid;
      }
      return lo;
    };
    const run = () => {
      box.classList.remove('p5r-ransom--break');
      let best = search(false);
      // One long word would shrink the whole message, so let it break between tiles instead
      if (!singleLine && best < MIN_READABLE) {
        box.classList.add('p5r-ransom--break');
        const broken = search(true);
        if (broken > best * BREAK_GAIN) best = broken; else box.classList.remove('p5r-ransom--break');
      }
      box.style.setProperty('--fs', `${best}px`);
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(box);
    document.fonts?.ready.then(run);
    return () => ro.disconnect();
  }, [words, shrink, ceiling, singleLine, cls]);

  let n = 0;
  return (
    <Root ref={boxRef} className={cls} style={shrink ? undefined : { '--fs': `${size}px` }}>
      <span className="p5r-sr-only">{text}</span>
      <span ref={tilesRef} className="p5r-ransom__tiles" aria-hidden="true">
        {words.map((tilesOfWord, wi) => (
          <span className="p5r-word" key={wi}>
            {tilesOfWord.map((t, ti) => (
              <span className="p5r-tile" key={ti} style={{ ...t.style, '--d': `${Math.round(delay + n++ * step)}ms` }}>{t.ch}</span>
            ))}
          </span>
        ))}
      </span>
    </Root>
  );
}
