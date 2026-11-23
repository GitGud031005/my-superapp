import { Button, Dialog, Panel, Tag } from '@superapp/p5r-ds';
import { useEffect, useState } from 'react';
import { deleteExpense, listExpenses, type Expense } from './api';
import { errorText } from './errors';
import { FormError } from './FormParts';
import type { Strings } from './i18n';
import { useLang, useT } from './i18nContext';
import { formatDate, formatMoney } from './money';

const PAGE = 50;

function summary(t: Strings, expense: Expense): string {
  const people = expense.participants.map((participant) => (participant.shares > 1 ? `${participant.name} ×${participant.shares}` : participant.name));
  if (expense.type !== 'GROUP') return `${people.join(', ')} · ${formatMoney(expense.shareAmount)}`;
  const owner = expense.ownerShares ? ` · ${t.expenses.you} ×${expense.ownerShares}` : '';
  return `${people.join(', ')}${owner} · ${t.expenses.each(formatMoney(expense.shareAmount))} · ${t.expenses.inAll(formatMoney(expense.total))}`;
}

export function ExpensesList({ onEdit, onChanged }: { onEdit: (expense: Expense) => void; onChanged: () => void }) {
  const t = useT();
  const { lang } = useLang();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [failure, setFailure] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [removing, setRemoving] = useState<Expense | null>(null);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    listExpenses(PAGE, 0)
      .then((first) => {
        if (ignore) return;
        setExpenses(first);
        setHasMore(first.length === PAGE);
        setStatus('ready');
      })
      .catch((reason: unknown) => {
        if (ignore) return;
        setFailure(reason);
        setStatus('error');
      });
    return () => {
      ignore = true;
    };
  }, [attempt]);

  async function refetch() {
    const limit = Math.max(PAGE, expenses.length);
    const next = await listExpenses(limit, 0);
    setExpenses(next);
    setHasMore(next.length === limit);
  }

  async function showMore() {
    setError('');
    try {
      const more = await listExpenses(PAGE, expenses.length);
      setExpenses((current) => [...current, ...more]);
      setHasMore(more.length === PAGE);
    } catch (reason) {
      setError(`${t.expenses.loadMoreFailed} ${errorText(t, reason)}`);
    }
  }

  async function remove() {
    if (!removing || deleting) return;
    setDeleting(true);
    try {
      await deleteExpense(removing.id);
    } catch (reason) {
      setRemoving(null);
      setError(`${t.expenses.deleteFailed} ${errorText(t, reason)}`);
      setDeleting(false);
      return;
    }
    setRemoving(null);
    setError('');
    onChanged();
    try {
      await refetch();
    } catch (reason) {
      setError(`${t.expenses.refreshFailed} ${errorText(t, reason)}`);
    }
    setDeleting(false);
  }

  if (status === 'loading') {
    return (
      <p role="status" className="phantom-ledger__status">
        {t.loading}
      </p>
    );
  }
  if (status === 'error') {
    return (
      <Panel title={t.couldntLoad}>
        <div className="phantom-ledger__stack">
          <p>{errorText(t, failure)}</p>
          <div>
            <Button
              variant="primary"
              onClick={() => {
                setStatus('loading');
                setAttempt((count) => count + 1);
              }}
            >
              {t.tryAgain}
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <div className="phantom-ledger__stack">
      <FormError message={error} />
      {expenses.length === 0 ? (
        <p>{t.expenses.empty}</p>
      ) : (
        <>
          <p className="phantom-ledger__row-sub">{t.expenses.newestFirst}</p>
          <ul className="phantom-ledger__list">
            {expenses.map((expense) => (
              <li key={expense.id} className="phantom-ledger__row">
                <div className="phantom-ledger__row-main">
                  <p className="phantom-ledger__row-title">
                    {expense.note} <span className="phantom-ledger__row-date">{formatDate(expense.date, lang)}</span>
                  </p>
                  <p className="phantom-ledger__row-sub">{summary(t, expense)}</p>
                  <Tag tone={expense.type === 'GROUP' ? 'red' : 'white'}>{expense.type === 'GROUP' ? t.expenses.group : t.expenses.personal}</Tag>
                </div>
                <div className="phantom-ledger__actions">
                  <Button variant="light" size="sm" aria-label={t.expenses.editAria(expense.note)} onClick={() => onEdit(expense)}>
                    {t.edit}
                  </Button>
                  <Button variant="light" size="sm" aria-label={t.expenses.deleteAria(expense.note)} onClick={() => setRemoving(expense)}>
                    {t.delete}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {hasMore && (
        <div>
          <Button onClick={() => void showMore()}>{t.expenses.showMore}</Button>
        </div>
      )}
      <Dialog
        open={removing !== null}
        closeLabel={t.close}
        title={t.expenses.deleteTitle}
        onClose={() => setRemoving(null)}
        actions={
          <>
            <Button onClick={() => setRemoving(null)}>{t.expenses.keep}</Button>
            <Button variant="primary" disabled={deleting} onClick={() => void remove()}>
              {t.expenses.delete}
            </Button>
          </>
        }
      >
        {removing && t.expenses.deleteText(removing.note, formatDate(removing.date, lang))}
      </Dialog>
    </div>
  );
}
