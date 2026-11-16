import '@superapp/p5r-ds/styles.css';
import { Banner, Button, Panel } from '@superapp/p5r-ds';
import './module.css';

export default function PhantomLedgerModule() {
  return (
    <div className="p5r-scope phantom-ledger">
      <div className="phantom-ledger__page">
        <Banner as="h1">Phantom Ledger</Banner>
        <Panel title="Targets">
          <div className="phantom-ledger__stack">
            <p>Nobody owes you anything yet. Debts and badminton invites will show up here.</p>
            <div>
              <Button variant="primary" disabled>
                Add a debt
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
