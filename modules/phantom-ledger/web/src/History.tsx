import { DateSticker } from '@superapp/p5r-ds';
import type { ReactNode } from 'react';
import type { Line } from './api';
import { dateParts, formatMoney } from './money';

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function detail(line: Line): string {
  if (line.kind === 'PAYMENT') return 'Payment';
  if (line.type === 'GROUP' && line.shares !== undefined && line.totalShares !== undefined) {
    return `×${plural(line.shares, 'share')} of ${line.totalShares}${line.shareAmount ? ` · ${formatMoney(line.shareAmount)} each` : ''}`;
  }
  return 'Personal';
}

export function History({ lines, actions }: { lines: Line[]; actions?: (line: Line) => ReactNode }) {
  return (
    <ul className="phantom-ledger__history">
      {lines.map((line, index) => {
        const { year, month, day, weekday } = dateParts(line.date);
        return (
          <li key={line.id ?? index} className="phantom-ledger__line">
            <DateSticker month={month} day={day} weekday={weekday} period={String(year)} />
            <div className="phantom-ledger__line-body">
              <p className="phantom-ledger__line-note">{line.note}</p>
              <p className="phantom-ledger__line-detail">{detail(line)}</p>
              {actions?.(line)}
            </div>
            <div className="phantom-ledger__line-money">
              <span className="phantom-ledger__amount">
                {line.kind === 'PAYMENT' ? '−' : ''}
                {formatMoney(line.amount)}
              </span>
              <span className="phantom-ledger__running">Balance {formatMoney(line.balance)}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
