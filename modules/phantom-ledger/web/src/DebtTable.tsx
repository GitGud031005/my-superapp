import { StatBar, Tag } from '@superapp/p5r-ds';
import type { CSSProperties, ReactNode } from 'react';
import type { Member } from './api';
import { useT } from './i18nContext';
import { formatMoney } from './money';

export interface DebtRow {
  member: Member;
  rank: number | null;
}

function MailIcon() {
  return (
    <svg className="phantom-ledger__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M3 5h18v14H3z M3 7l9 7 9-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
    </svg>
  );
}

function MailOffIcon() {
  return (
    <svg className="phantom-ledger__icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M3 5h18v14H3z M4 20L20 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
    </svg>
  );
}

export function DebtTable({
  rows,
  largest,
  renderActions,
}: {
  rows: DebtRow[];
  largest: number;
  renderActions: (member: Member) => ReactNode;
}) {
  const t = useT();

  return (
    <table className="phantom-ledger__table" role="table">
      <caption className="p5r-sr-only">{t.table.caption}</caption>
      <thead role="rowgroup">
        <tr role="row">
          <th scope="col" role="columnheader" className="phantom-ledger__col-rank">
            {t.table.rank}
          </th>
          <th scope="col" role="columnheader">
            {t.table.name}
          </th>
          <th scope="col" role="columnheader" className="phantom-ledger__col-balance">
            {t.table.balance}
          </th>
          <th scope="col" role="columnheader">
            {t.table.share}
          </th>
          <th scope="col" role="columnheader">
            {t.table.gmail}
          </th>
          <th scope="col" role="columnheader">
            {t.table.actions}
          </th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map(({ member, rank }, index) => {
          const owing = member.balance > 0;
          const linked = member.email !== null;
          return (
            <tr key={member.id} role="row" className="phantom-ledger__debt" data-owing={owing} style={{ '--i': Math.min(index, 8) } as CSSProperties}>
              <td role="cell" data-label={t.table.rank} className="phantom-ledger__col-rank">
                <span className="phantom-ledger__rank">
                  {rank !== null && rank <= 3 && (
                    <>
                      <span aria-hidden="true" className="phantom-ledger__decor phantom-ledger__decor--star5 phantom-ledger__badge" />
                      <span className="p5r-sr-only">{t.table.top(rank)}</span>
                    </>
                  )}
                  <span aria-hidden={rank !== null && rank <= 3 ? 'true' : undefined}>{rank ?? '–'}</span>
                </span>
              </td>
              <th scope="row" role="rowheader" className="phantom-ledger__col-name">
                <span className="phantom-ledger__name">{member.name}</span>
              </th>
              <td role="cell" data-label={t.table.balance} className="phantom-ledger__col-balance">
                <span className="phantom-ledger__money">{formatMoney(member.balance)}</span>
              </td>
              <td role="cell" data-label={t.table.share} className="phantom-ledger__col-bar">
                {owing ? (
                  <div className="phantom-ledger__bar" aria-hidden="true">
                    <StatBar label={member.name} value={member.balance} max={largest} kind="hp" />
                  </div>
                ) : (
                  <Tag tone={member.balance < 0 ? 'yellow' : 'white'}>{member.balance < 0 ? t.table.ahead : t.table.settled}</Tag>
                )}
              </td>
              <td role="cell" data-label={t.table.gmail} className="phantom-ledger__col-gmail">
                <span className="phantom-ledger__gmail">
                  {linked ? <MailIcon /> : <MailOffIcon />}
                  {linked ? t.table.gmailLinked : t.table.gmailNotLinked}
                </span>
              </td>
              <td role="cell" className="phantom-ledger__col-actions">
                <div className="phantom-ledger__actions">{renderActions(member)}</div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
