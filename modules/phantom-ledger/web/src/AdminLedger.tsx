import { AwardToast, Button, Dialog, Panel } from '@superapp/p5r-ds';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { listMembers, type Expense, type Line, type Member, type Mine } from './api';
import { DebtTable, type DebtRow } from './DebtTable';
import { ExpensesList } from './ExpensesList';
import { GroupDebtForm } from './GroupDebtForm';
import { useLoad } from './hooks';
import { useT } from './i18nContext';
import { Loaded } from './Loaded';
import { MemberForm } from './MemberForm';
import { MemberHistory } from './MemberHistory';
import { MyLedger } from './MyLedger';
import { formatMoney } from './money';
import { PaymentForm } from './PaymentForm';
import { PersonalDebtForm } from './PersonalDebtForm';
import { ledgerStats, sortByDebt } from './view';

type Modal =
  | { kind: 'group'; expense?: Expense; returnTo?: Modal }
  | { kind: 'personal'; expense?: Expense; returnTo?: Modal }
  | { kind: 'member'; member?: Member; returnTo?: Modal }
  | { kind: 'payment'; member: Member; payment?: Line; returnTo?: Modal }
  | { kind: 'history'; memberId: string }
  | { kind: 'expenses' }
  | { kind: 'mine' };

function modalKey(modal: Modal | null): string | null {
  if (!modal) return null;
  switch (modal.kind) {
    case 'group':
    case 'personal':
      return `${modal.kind}:${modal.expense?.id ?? ''}`;
    case 'member':
      return `member:${modal.member?.id ?? ''}`;
    case 'payment':
      return `payment:${modal.member.id}:${modal.payment?.id ?? ''}`;
    case 'history':
      return `history:${modal.memberId}`;
    default:
      return modal.kind;
  }
}

function Stat({ label, index, children }: { label: string; index: number; children: ReactNode }) {
  return (
    <div className="phantom-ledger__stat" style={{ '--i': index } as CSSProperties}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function AdminLedger({ mine }: { mine: Mine | null }) {
  const t = useT();
  const { load, stale, reload, refresh } = useLoad(listMembers);
  const [modal, setModalState] = useState<Modal | null>(null);
  const [hideSettled, setHideSettled] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const current = useRef<Modal | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const shownKey = useRef<string | null>(null);

  const sorted = useMemo(() => (load.status === 'ready' ? sortByDebt(load.data) : []), [load]);
  const members = load.status === 'ready' ? load.data : [];

  function setModal(next: Modal | null) {
    current.current = next;
    setModalState(next);
  }

  function open(next: Modal) {
    setNotice(null);
    setModal(next);
  }

  function close() {
    setModal(null);
  }

  // A request can finish after Escape closed its dialog; it must not reopen anything then.
  function leave(from: Modal) {
    if (current.current !== from) return;
    setModal('returnTo' in from ? (from.returnTo ?? null) : null);
  }

  function saved(from: Modal, detail: string) {
    refresh();
    setNotice(detail);
    leave(from);
  }

  const key = modalKey(modal);
  useEffect(() => {
    const swapped = shownKey.current !== null && key !== null && key !== shownKey.current;
    shownKey.current = key;
    if (!swapped) return;
    const heading = body.current?.closest('dialog')?.querySelector('h2');
    if (!heading) return;
    heading.tabIndex = -1;
    heading.focus();
  }, [key]);

  const dialog = modal && modalContent(modal);

  function modalContent(from: Modal): { title: string; body: ReactNode; closeButton?: boolean } {
    switch (from.kind) {
      case 'group':
        return {
          title: from.expense ? t.group.editTitle : t.group.title,
          body: (
            <GroupDebtForm members={members} expense={from.expense} onSaved={(detail) => saved(from, detail)} onCancel={() => leave(from)} />
          ),
        };
      case 'personal':
        return {
          title: from.expense ? t.personal.editTitle : t.personal.title,
          body: (
            <PersonalDebtForm
              members={members}
              expense={from.expense}
              onSaved={(detail) => saved(from, detail)}
              onCancel={() => leave(from)}
            />
          ),
        };
      case 'member':
        return {
          title: from.member ? t.member.editTitle : t.member.addTitle,
          body: (
            <MemberForm
              key={from.member?.id ?? 'new'}
              member={from.member}
              onSaved={(detail) => saved(from, detail)}
              onDeleted={() => {
                refresh();
                if (current.current === from) close();
              }}
              onCancel={() => leave(from)}
            />
          ),
        };
      case 'payment':
        return {
          title: from.payment ? t.payment.editTitle : t.payment.recordTitle,
          body: (
            <PaymentForm member={from.member} payment={from.payment} onSaved={(detail) => saved(from, detail)} onCancel={() => leave(from)} />
          ),
        };
      case 'history':
        return {
          title: members.find((member) => member.id === from.memberId)?.name ?? t.history.heading,
          closeButton: true,
          body: (
            <MemberHistory
              memberId={from.memberId}
              onChanged={refresh}
              onRecordPayment={(member) => setModal({ kind: 'payment', member, returnTo: from })}
              onEditPayment={(member, payment) => setModal({ kind: 'payment', member, payment, returnTo: from })}
              onEditMember={(member) => setModal({ kind: 'member', member, returnTo: from })}
            />
          ),
        };
      case 'expenses':
        return {
          title: t.expenses.title,
          closeButton: true,
          body: (
            <ExpensesList
              onChanged={refresh}
              onEdit={(expense) => setModal({ kind: expense.type === 'GROUP' ? 'group' : 'personal', expense, returnTo: from })}
            />
          ),
        };
      case 'mine':
        return { title: t.friend.myLedger, closeButton: true, body: mine && <MyLedger mine={mine} /> };
    }
  }

  return (
    <div className="phantom-ledger__stack">
      <Loaded load={load} onRetry={reload}>
        {(list) => {
          const stats = ledgerStats(list);
          const rows: DebtRow[] = sorted
            .map((member, index) => ({ member, rank: member.balance > 0 ? index + 1 : null }))
            .filter(({ member }) => !(hideSettled && member.balance === 0));
          const largest = Math.max(0, ...list.map((member) => member.balance));

          return (
            <>
              <section aria-label={t.stats.label}>
                <dl className="phantom-ledger__stats" data-count={stats.ahead > 0 ? 4 : 3}>
                  <Stat label={t.stats.totalOwed} index={0}>
                    <span className="phantom-ledger__stat-value phantom-ledger__stat-value--money">{formatMoney(stats.totalOwed)}</span>
                  </Stat>
                  <Stat label={t.stats.owing} index={1}>
                    <span className="phantom-ledger__stat-value">{stats.owing}</span> {t.stats.people(stats.owing)}
                  </Stat>
                  <Stat label={t.stats.settled} index={2}>
                    <span className="phantom-ledger__stat-value">{stats.settled}</span> {t.stats.people(stats.settled)}
                  </Stat>
                  {stats.ahead > 0 && (
                    <Stat label={t.stats.ahead} index={3}>
                      <span className="phantom-ledger__stat-value">{stats.ahead}</span> {t.stats.people(stats.ahead)}
                    </Stat>
                  )}
                </dl>
              </section>

              <div className="phantom-ledger__menu" role="group" aria-label={t.actions.label}>
                <div className="phantom-ledger__entries">
                  <div className="phantom-ledger__entry">
                    <Button variant="primary" className="phantom-ledger__entry-button" onClick={() => open({ kind: 'group' })}>
                      <span aria-hidden="true" className="phantom-ledger__arrow" />
                      {t.actions.groupDebt}
                    </Button>
                  </div>
                  <div className="phantom-ledger__entry">
                    <Button variant="light" className="phantom-ledger__entry-button" onClick={() => open({ kind: 'personal' })}>
                      <span aria-hidden="true" className="phantom-ledger__arrow" />
                      {t.actions.personalDebt}
                    </Button>
                  </div>
                </div>
                <div className="phantom-ledger__secondary">
                  <Button variant="light" size="sm" onClick={() => open({ kind: 'member' })}>
                    {t.actions.addMember}
                  </Button>
                  <Button variant="light" size="sm" onClick={() => open({ kind: 'expenses' })}>
                    {t.actions.allExpenses}
                  </Button>
                  {mine && (
                    <Button variant="light" size="sm" onClick={() => open({ kind: 'mine' })}>
                      {t.friend.myLedger}
                    </Button>
                  )}
                </div>
              </div>

              <div role="status" className="p5r-sr-only">
                {notice ? `${t.saved}: ${notice}` : ''}
              </div>
              {notice && (
                <div aria-hidden="true">
                  <AwardToast title={t.saved}>{notice}</AwardToast>
                </div>
              )}
              {stale && (
                <div role="alert" className="phantom-ledger__stale">
                  <p>{t.refreshFailed}</p>
                  <Button variant="light" size="sm" onClick={refresh}>
                    {t.tryAgain}
                  </Button>
                </div>
              )}

              {list.length === 0 ? (
                <Panel title={t.table.noMembers}>
                  <p>{t.table.noMembersText}</p>
                </Panel>
              ) : (
                <>
                  <label className="phantom-ledger__check">
                    <input type="checkbox" checked={hideSettled} onChange={(event) => setHideSettled(event.target.checked)} />
                    {t.table.hideSettled}
                  </label>
                  {rows.length === 0 ? (
                    <p>{t.table.allHidden}</p>
                  ) : (
                    <DebtTable
                      rows={rows}
                      largest={largest}
                      renderActions={(member) => (
                        <>
                          <Button variant="light" size="sm" aria-label={t.table.historyOf(member.name)} onClick={() => open({ kind: 'history', memberId: member.id })}>
                            {t.table.history}
                          </Button>
                          <Button variant="light" size="sm" aria-label={t.table.recordPaymentFor(member.name)} onClick={() => open({ kind: 'payment', member })}>
                            {t.table.recordPayment}
                          </Button>
                        </>
                      )}
                    />
                  )}
                </>
              )}
            </>
          );
        }}
      </Loaded>

      <Dialog open={modal !== null} title={dialog?.title ?? ''} onClose={close} closeLabel={t.close} actions={dialog?.closeButton && <Button onClick={close}>{t.close}</Button>}>
        <div ref={body}>{dialog?.body}</div>
      </Dialog>
    </div>
  );
}
