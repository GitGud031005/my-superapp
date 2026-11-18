import { DateSticker } from '@superapp/p5r-ds';
import type { ReactNode } from 'react';
import type { Line } from './api';
import type { Strings } from './i18n';
import { useLang, useT } from './i18nContext';
import { dateParts, formatMoney } from './money';

function detail(t: Strings, line: Line): string {
  if (line.kind === 'PAYMENT') return t.history.payment;
  if (line.type === 'GROUP' && line.shares !== undefined && line.totalShares !== undefined) {
    const shares = t.history.shareOf(line.shares, line.totalShares);
    return line.shareAmount ? `${shares} · ${t.history.each(formatMoney(line.shareAmount))}` : shares;
  }
  return t.history.personal;
}

export function History({ lines, actions }: { lines: Line[]; actions?: (line: Line) => ReactNode }) {
  const t = useT();
  const { lang } = useLang();
  return (
    <ul className="phantom-ledger__history">
      {lines.map((line, index) => {
        const { year, month, day, weekday } = dateParts(line.date, lang);
        return (
          <li key={line.id ?? index} className="phantom-ledger__line">
            {/* DateSticker prints month/day; Vietnamese reads day/month, so the numbers swap places */}
            <DateSticker month={lang === 'vi' ? day : month} day={lang === 'vi' ? month : day} weekday={weekday} period={String(year)} />
            <div className="phantom-ledger__line-body">
              <p className="phantom-ledger__line-note">{line.note}</p>
              <p className="phantom-ledger__line-detail">{detail(t, line)}</p>
              {actions?.(line)}
            </div>
            <div className="phantom-ledger__line-money">
              <span className="phantom-ledger__amount">
                {line.kind === 'PAYMENT' ? '−' : ''}
                {formatMoney(line.amount)}
              </span>
              <span className="phantom-ledger__running">{t.history.balance(formatMoney(line.balance))}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
