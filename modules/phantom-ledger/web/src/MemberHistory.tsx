import { Button, Dialog } from '@superapp/p5r-ds';
import { useCallback, useState } from 'react';
import { deletePayment, getMemberHistory, type Line, type Member } from './api';
import { errorText } from './errors';
import { FormError } from './FormParts';
import { History } from './History';
import { useLoad } from './hooks';
import { useLang, useT } from './i18nContext';
import { Loaded } from './Loaded';
import { formatDate, formatMoney } from './money';

export function MemberHistory({
  memberId,
  onRecordPayment,
  onEditPayment,
  onEditMember,
  onChanged,
}: {
  memberId: string;
  onRecordPayment: (member: Member) => void;
  onEditPayment: (member: Member, payment: Line) => void;
  onEditMember: (member: Member) => void;
  onChanged: () => void;
}) {
  const t = useT();
  const { lang } = useLang();
  const loader = useCallback(() => getMemberHistory(memberId), [memberId]);
  const { load, reload } = useLoad(loader);
  const [removing, setRemoving] = useState<Line | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function removePayment() {
    if (!removing?.id || deleting) return;
    setDeleting(true);
    try {
      await deletePayment(removing.id);
      setRemoving(null);
      setError('');
      reload();
      onChanged();
    } catch (failure) {
      setRemoving(null);
      setError(`${t.fieldErrorLabel}: ${errorText(t, failure)}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Loaded load={load} onRetry={reload}>
      {({ member, history }) => (
        <div className="phantom-ledger__stack">
          <div>
            <p className="phantom-ledger__balance-label">
              {member.balance > 0 ? t.history.owes : member.balance < 0 ? t.history.ahead : t.history.settled}
            </p>
            {member.balance !== 0 && <p className="phantom-ledger__balance phantom-ledger__balance--sm">{formatMoney(Math.abs(member.balance))}</p>}
          </div>
          <div className="phantom-ledger__actions">
            <Button variant="light" onClick={() => onRecordPayment(member)}>
              {t.table.recordPayment}
            </Button>
            <Button variant="light" onClick={() => onEditMember(member)}>
              {t.history.editMember}
            </Button>
          </div>
          <FormError message={error} />
          {history.length === 0 ? (
            <p>{t.history.empty}</p>
          ) : (
            <History
              lines={history}
              actions={(line) =>
                line.kind === 'PAYMENT' && (
                  <div className="phantom-ledger__actions">
                    <Button variant="light" size="sm" onClick={() => onEditPayment(member, line)}>
                      {t.edit}
                    </Button>
                    <Button variant="light" size="sm" onClick={() => setRemoving(line)}>
                      {t.delete}
                    </Button>
                  </div>
                )
              }
            />
          )}
          <Dialog
            open={removing !== null}
            closeLabel={t.close}
            title={t.history.deletePaymentTitle}
            onClose={() => setRemoving(null)}
            actions={
              <>
                <Button onClick={() => setRemoving(null)}>{t.history.keepPayment}</Button>
                <Button variant="primary" disabled={deleting} onClick={() => void removePayment()}>
                  {t.history.deletePayment}
                </Button>
              </>
            }
          >
            {removing && t.history.deletePaymentText(formatMoney(removing.amount), formatDate(removing.date, lang), member.name)}
          </Dialog>
        </div>
      )}
    </Loaded>
  );
}
