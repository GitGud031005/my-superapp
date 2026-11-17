import { AwardToast, Button, Dialog, Panel, Tag } from '@superapp/p5r-ds';
import { useEffect, useState } from 'react';
import { deleteExpense, listExpenses, listMembers, type Expense, type Member } from './api';
import { ExpenseForm } from './ExpenseForm';
import { useLoad } from './hooks';
import { Loaded } from './Loaded';
import { formatMoney } from './money';

const PAGE = 50;

export function AddExpenseTab() {
  const { load, reload } = useLoad(listMembers);
  const [saved, setSaved] = useState<Expense | null>(null);
  const [round, setRound] = useState(0);

  return (
    <div className="phantom-ledger__stack">
      {saved && (
        <AwardToast title="Expense saved">
          {saved.note}: {formatMoney(saved.total)} across {saved.totalShares} {saved.totalShares === 1 ? 'share' : 'shares'}
        </AwardToast>
      )}
      <Loaded load={load} onRetry={reload}>
        {(members) =>
          members.length === 0 ? (
            <Panel title="No members yet">
              <p>Add members first.</p>
            </Panel>
          ) : (
            <ExpenseForm
              key={round}
              members={members}
              onSaved={(expense) => {
                setSaved(expense);
                setRound((count) => count + 1);
              }}
            />
          )
        }
      </Loaded>
    </div>
  );
}

function summary(expense: Expense): string {
  const people = expense.participants.map((participant) => (participant.shares > 1 ? `${participant.name} ×${participant.shares}` : participant.name));
  const price = `${formatMoney(expense.shareAmount)} each`;
  return expense.type === 'GROUP'
    ? `${people.join(', ')}${expense.ownerShares ? ` · you ×${expense.ownerShares}` : ''} · ${price} · ${formatMoney(expense.total)} in all`
    : `${people.join(', ')} · ${formatMoney(expense.shareAmount)}`;
}

export function ExpensesTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [removing, setRemoving] = useState<Expense | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    Promise.all([listExpenses(PAGE, 0), listMembers()])
      .then(([first, everyone]) => {
        if (ignore) return;
        setExpenses(first);
        setHasMore(first.length === PAGE);
        setMembers(everyone);
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus('error');
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
    } catch {
      setError('Could not load more expenses.');
    }
  }

  async function remove() {
    if (!removing) return;
    try {
      await deleteExpense(removing.id);
      setRemoving(null);
      await refetch();
    } catch {
      setRemoving(null);
      setError('Could not delete that expense.');
    }
  }

  if (status === 'loading') {
    return (
      <p role="status" className="phantom-ledger__status">
        Loading…
      </p>
    );
  }
  if (status === 'error') {
    return (
      <Panel title="Couldn't load">
        <div className="phantom-ledger__stack">
          <p>The expenses could not be loaded.</p>
          <div>
            <Button
              variant="primary"
              onClick={() => {
                setStatus('loading');
                setAttempt((count) => count + 1);
              }}
            >
              Try again
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  if (editing) {
    return (
      <ExpenseForm
        key={editing.id}
        members={members}
        expense={editing}
        onCancel={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void refetch();
        }}
      />
    );
  }

  return (
    <div className="phantom-ledger__stack">
      {error && (
        <p role="alert" className="phantom-ledger__error">
          Error: {error}
        </p>
      )}
      {expenses.length === 0 ? (
        <Panel title="Nothing yet">
          <p>No expenses have been recorded. Add one from the Add expense tab.</p>
        </Panel>
      ) : (
        <ul className="phantom-ledger__list">
          {expenses.map((expense) => (
            <li key={expense.id} className="phantom-ledger__row">
              <div className="phantom-ledger__row-main">
                <p className="phantom-ledger__row-title">
                  {expense.note} <span className="phantom-ledger__row-date">{expense.date}</span>
                </p>
                <p className="phantom-ledger__row-sub">{summary(expense)}</p>
                <Tag tone={expense.type === 'GROUP' ? 'red' : 'white'}>{expense.type === 'GROUP' ? 'Group' : 'Personal'}</Tag>
              </div>
              <div className="phantom-ledger__actions">
                <Button size="sm" onClick={() => setEditing(expense)}>
                  Edit
                </Button>
                <Button size="sm" onClick={() => setRemoving(expense)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <div>
          <Button onClick={() => void showMore()}>Show more</Button>
        </div>
      )}
      <Dialog
        open={removing !== null}
        title="Delete this expense?"
        onClose={() => setRemoving(null)}
        actions={
          <>
            <Button onClick={() => setRemoving(null)}>Keep expense</Button>
            <Button variant="primary" onClick={() => void remove()}>
              Delete expense
            </Button>
          </>
        }
      >
        {removing && `"${removing.note}" on ${removing.date} will be removed from every participant's history and balance.`}
      </Dialog>
    </div>
  );
}
