// Original decorative shapes drawn with CSS clip-paths and one SVG stroke. They carry no meaning:
// hidden from assistive tech, never interactive, and always placed where no text sits.
function className(base: string, extra?: string): string {
  return `phantom-ledger__decor ${base}${extra ? ` ${extra}` : ''}`;
}

export function Star({ points, className: extra }: { points: 4 | 5; className?: string }) {
  return <span aria-hidden="true" className={className(`phantom-ledger__decor--star${points}`, extra)} />;
}

export function Splatter({ className: extra }: { className?: string }) {
  return <span aria-hidden="true" className={className('phantom-ledger__decor--splatter', extra)} />;
}

export function Tape({ className: extra }: { className?: string }) {
  return <span aria-hidden="true" className={className('phantom-ledger__decor--tape', extra)} />;
}

export function Scribble({ className: extra }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 100 50" className={className('phantom-ledger__decor--scribble', extra)}>
      <path d="M4 44 L30 18 L27 38 L60 10 L55 32 L92 6 M92 6 L76 8 M92 6 L88 22" />
    </svg>
  );
}
