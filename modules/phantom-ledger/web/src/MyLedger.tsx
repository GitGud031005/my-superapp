import { Banner, Panel } from '@superapp/p5r-ds';
import type { Mine } from './api';
import { History } from './History';
import { useT } from './i18nContext';
import { formatMoney } from './money';

export function MyLedger({ mine }: { mine: Mine }) {
  const t = useT();
  const label = mine.balance > 0 ? t.friend.owe : mine.balance < 0 ? t.friend.ahead : t.friend.settled;
  return (
    <div className="phantom-ledger__stack">
      <Panel title={mine.name}>
        <p className="phantom-ledger__balance-label">{label}</p>
        <p className="phantom-ledger__balance">{formatMoney(Math.abs(mine.balance))}</p>
      </Panel>
      <Banner as="h2" tone="black">
        {t.friend.history}
      </Banner>
      {mine.history.length === 0 ? <p>{t.friend.empty}</p> : <History lines={mine.history} />}
    </div>
  );
}

export function Unlinked({ email }: { email: string }) {
  const t = useT();
  return (
    <Panel title={t.friend.unlinkedTitle}>
      <div className="phantom-ledger__stack">
        <p>{t.friend.unlinked(email)}</p>
      </div>
    </Panel>
  );
}
