import { Tabs } from '@superapp/p5r-ds';
import { useState, type ReactNode } from 'react';
import { getMyLedger } from './api';
import { AddExpenseTab, ExpensesTab } from './ExpensesTab';
import { useLoad } from './hooks';
import { Loaded } from './Loaded';
import { ImportTab } from './ImportTab';
import { MembersTab } from './MembersTab';
import { MyLedger, Unlinked } from './MyLedger';

const ADMIN_TABS = [
  { id: 'members', label: 'Members' },
  { id: 'add', label: 'Add expense' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'import', label: 'Import' },
];

export function Ledger({ email }: { email: string }) {
  const { load, reload, refresh } = useLoad(getMyLedger);
  const [chosen, setChosen] = useState<string | null>(null);

  return (
    <Loaded load={load} onRetry={reload}>
      {(ledger) => {
        const tabs = [...(ledger.admin ? ADMIN_TABS : []), ...(ledger.member ? [{ id: 'mine', label: 'My ledger' }] : [])];
        const current = tabs.some((tab) => tab.id === chosen) ? chosen : tabs[0]?.id;
        const panels: Record<string, () => ReactNode> = {
          mine: () => ledger.member && <MyLedger mine={ledger.member} />,
          members: () => <MembersTab />,
          add: () => <AddExpenseTab />,
          expenses: () => <ExpensesTab />,
          import: () => <ImportTab />,
        };

        if (tabs.length === 0) return <Unlinked email={email} />;
        return (
          <div className="phantom-ledger__stack">
            {tabs.length > 1 && (
              <Tabs
                label="Ledger sections"
                items={tabs.map((tab) => ({ ...tab, panelId: `panel-${tab.id}` }))}
                value={current ?? ''}
                onChange={(id) => {
                  setChosen(id);
                  refresh();
                }}
              />
            )}
            {tabs.map((tab) => (
              <section
                key={tab.id}
                role="tabpanel"
                id={`panel-${tab.id}`}
                aria-labelledby={tabs.length > 1 ? `panel-${tab.id}-tab` : undefined}
                aria-label={tabs.length > 1 ? undefined : tab.label}
                hidden={tab.id !== current}
              >
                {tab.id === current && panels[tab.id]()}
              </section>
            ))}
          </div>
        );
      }}
    </Loaded>
  );
}
