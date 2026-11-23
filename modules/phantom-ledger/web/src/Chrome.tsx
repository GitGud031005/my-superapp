import { Button, RansomTitle } from '@superapp/p5r-ds';
import { Scribble, Splatter, Star, Tape } from './Decor';
import { useT } from './i18nContext';
import { LangToggle } from './LangToggle';

export function Backdrop() {
  return (
    <div className="phantom-ledger__backdrop" aria-hidden="true">
      <div className="phantom-ledger__rings" />
      <div className="phantom-ledger__rays" />
      <Splatter className="phantom-ledger__corner phantom-ledger__corner--bottom-start" />
      <Star points={5} className="phantom-ledger__corner phantom-ledger__corner--top-end" />
      <Star points={4} className="phantom-ledger__corner phantom-ledger__corner--bottom-end" />
      <Scribble className="phantom-ledger__corner phantom-ledger__corner--mid-start" />
    </div>
  );
}

export function Hero() {
  return (
    <header className="phantom-ledger__hero">
      <Splatter className="phantom-ledger__hero-splat" />
      <Star points={5} className="phantom-ledger__hero-star phantom-ledger__hero-star--a" />
      <Star points={4} className="phantom-ledger__hero-star phantom-ledger__hero-star--b" />
      <Star points={4} className="phantom-ledger__hero-star phantom-ledger__hero-star--c" />
      <div className="phantom-ledger__hero-slab">
        <div className="phantom-ledger__title">
          <RansomTitle as="h1" text="Phantom Ledger" skin="logo" fit maxSize={96} />
        </div>
      </div>
      <Tape className="phantom-ledger__tape phantom-ledger__tape--a" />
      <Tape className="phantom-ledger__tape phantom-ledger__tape--b" />
    </header>
  );
}

export function TopBar({ name, onSignOut }: { name?: string; onSignOut: () => void }) {
  const t = useT();
  return (
    <div className="phantom-ledger__topbar">
      <div className="phantom-ledger__topbar-inner">
        <a className="phantom-ledger__back" href="/">
          <span>{t.backToSuperapp}</span>
        </a>
        {name && (
          <p className="phantom-ledger__signed-in">
            {t.session.signedInAs} <strong>{name}</strong>
          </p>
        )}
        <div className="phantom-ledger__actions">
          <LangToggle />
          {name && (
            <Button variant="light" size="sm" onClick={onSignOut}>
              {t.session.signOut}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
