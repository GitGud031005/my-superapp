import { Banner, Panel } from '@superapp/p5r-ds';
import type { Mine } from './api';
import { History } from './History';
import { formatMoney } from './money';

export function MyLedger({ mine }: { mine: Mine }) {
  const label = mine.balance > 0 ? 'You owe' : mine.balance < 0 ? 'You are ahead by' : 'All settled';
  return (
    <div className="phantom-ledger__stack">
      <Panel title={mine.name}>
        <p className="phantom-ledger__balance-label">{label}</p>
        <p className="phantom-ledger__balance">{formatMoney(Math.abs(mine.balance))}</p>
      </Panel>
      <Banner as="h2" tone="white">
        History
      </Banner>
      {mine.history.length === 0 ? <p>Nothing has been recorded for you yet.</p> : <History lines={mine.history} />}
    </div>
  );
}

export function Unlinked({ email }: { email: string }) {
  return (
    <Panel title="No ledger yet">
      <div className="phantom-ledger__stack">
        <p>No ledger is linked to this account. Ask the admin to add {email} to your member profile.</p>
      </div>
    </Panel>
  );
}
