import { Button, Panel, Tabs, Tag, TextField } from '@superapp/p5r-ds';
import { useState, type FormEvent } from 'react';
import { createExpense, updateExpense, type Expense, type ExpenseInput, type ExpenseType, type Member } from './api';
import { formatMoney, parseAmount, shareFromTotal, todayIso } from './money';

type Pricing = 'share' | 'total';

const TYPES = [
  { id: 'GROUP', label: 'Group' },
  { id: 'PERSONAL', label: 'Personal' },
];

const PRICING = [
  { id: 'share', label: 'Price per share' },
  { id: 'total', label: 'Total' },
];

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (next: number) => void }) {
  return (
    <div role="group" aria-label={label} className="phantom-ledger__stepper">
      <Button variant="dark" size="sm" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </Button>
      <output aria-label={label} className="phantom-ledger__stepper-value">
        {value}
      </output>
      <Button variant="dark" size="sm" aria-label={`More ${label}`} onClick={() => onChange(value + 1)}>
        +
      </Button>
    </div>
  );
}

export function ExpenseForm({
  members,
  expense,
  onSaved,
  onCancel,
}: {
  members: Member[];
  expense?: Expense;
  onSaved: (expense: Expense) => void;
  onCancel?: () => void;
}) {
  const [type, setType] = useState<ExpenseType>(expense?.type ?? 'GROUP');
  const [date, setDate] = useState(expense?.date ?? todayIso());
  const [note, setNote] = useState(expense?.note ?? 'Badminton');
  const [shares, setShares] = useState<Record<string, number>>(() =>
    Object.fromEntries((expense?.participants ?? []).map((participant) => [participant.memberId, participant.shares])),
  );
  const [ownerShares, setOwnerShares] = useState(expense?.ownerShares ?? 0);
  const [pricing, setPricing] = useState<Pricing>('share');
  const [amountText, setAmountText] = useState(expense ? String(expense.shareAmount) : '');
  const [errors, setErrors] = useState<{ note?: string; participants?: string; amount?: string; server?: string }>({});
  const [busy, setBusy] = useState(false);

  const group = type === 'GROUP';
  const picked = members.filter((member) => shares[member.id]);
  const totalShares = picked.reduce((sum, member) => sum + shares[member.id], 0) + (group ? ownerShares : 0);
  const amount = parseAmount(amountText);
  const byTotal = group && pricing === 'total';
  const sharePrice = amount && amount > 0 && totalShares > 0 ? (byTotal ? shareFromTotal(amount, totalShares) : amount) : null;

  function chooseType(next: string) {
    setType(next as ExpenseType);
    if (next === 'PERSONAL') {
      const first = picked[0];
      setShares(first ? { [first.id]: 1 } : {});
      setOwnerShares(0);
    }
  }

  function toggle(member: Member) {
    setShares((current) => {
      if (current[member.id]) {
        return Object.fromEntries(Object.entries(current).filter(([id]) => id !== member.id));
      }
      return group ? { ...current, [member.id]: 1 } : { [member.id]: 1 };
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: typeof errors = {};
    if (!note.trim()) next.note = 'Write what this was for';
    if (picked.length === 0) next.participants = group ? 'Pick at least one member' : 'Pick a member';
    if (amount === null || amount <= 0) next.amount = 'Write an amount like 56k, 56000 or 56.000';
    setErrors(next);
    if (Object.keys(next).length > 0 || amount === null) return;

    const input: ExpenseInput = {
      type,
      date,
      note: note.trim(),
      participants: picked.map((member) => ({ memberId: member.id, shares: shares[member.id] })),
      ownerShares: group ? ownerShares : 0,
      ...(byTotal ? { total: amount } : { shareAmount: amount }),
    };
    setBusy(true);
    try {
      onSaved(await (expense ? updateExpense(expense.id, input) : createExpense(input)));
    } catch (failure) {
      setErrors({ server: failure instanceof Error ? failure.message : 'Something went wrong.' });
      setBusy(false);
    }
  }

  return (
    <Panel tone="light" title={expense ? 'Edit expense' : 'Add expense'}>
      <form className="phantom-ledger__stack" onSubmit={(event) => void submit(event)} noValidate>
        <Tabs label="Expense type" items={TYPES} value={type} onChange={chooseType} />
        <TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <TextField label="Note" value={note} onChange={(event) => setNote(event.target.value)} error={errors.note} maxLength={200} />

        <fieldset className="phantom-ledger__fieldset">
          <legend className="phantom-ledger__legend">{group ? 'Who joined' : 'Who owes this'}</legend>
          <div className="phantom-ledger__toggles">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                className="phantom-ledger__toggle"
                aria-pressed={Boolean(shares[member.id])}
                onClick={() => toggle(member)}
              >
                <Tag tone={shares[member.id] ? 'cyan' : 'black'}>{member.name}</Tag>
              </button>
            ))}
          </div>
          {errors.participants && <p className="phantom-ledger__error">Error: {errors.participants}</p>}
        </fieldset>

        {group && picked.length > 0 && (
          <ul className="phantom-ledger__list">
            {picked.map((member) => (
              <li key={member.id} className="phantom-ledger__row">
                <span className="phantom-ledger__row-title">{member.name}</span>
                <Stepper
                  label={`shares for ${member.name}`}
                  value={shares[member.id]}
                  min={1}
                  onChange={(next) => setShares((current) => ({ ...current, [member.id]: next }))}
                />
              </li>
            ))}
          </ul>
        )}

        {group && (
          <div className="phantom-ledger__row">
            <span className="phantom-ledger__row-title">Your own shares</span>
            <Stepper label="your own shares" value={ownerShares} min={0} onChange={setOwnerShares} />
          </div>
        )}

        {group && <Tabs label="Pricing" items={PRICING} value={pricing} onChange={(next) => setPricing(next as Pricing)} />}
        <TextField
          label={byTotal ? 'Total' : group ? 'Price per share' : 'Price'}
          hint="56k, 56000 or 56.000"
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          error={errors.amount}
          autoComplete="off"
        />

        {sharePrice !== null && amount !== null && (
          <p className="phantom-ledger__preview" aria-live="polite">
            {byTotal
              ? `${formatMoney(amount)} over ${totalShares} shares rounds up to ${formatMoney(sharePrice)} each, ${formatMoney(sharePrice * totalShares)} in all${sharePrice * totalShares > amount ? ` (${formatMoney(sharePrice * totalShares - amount)} over)` : ''}.`
              : group
                ? `${totalShares} shares × ${formatMoney(sharePrice)} = ${formatMoney(sharePrice * totalShares)} in all.`
                : `${formatMoney(sharePrice)} will be added to the balance.`}
          </p>
        )}

        {errors.server && (
          <p role="alert" className="phantom-ledger__error">
            Error: {errors.server}
          </p>
        )}
        <div className="phantom-ledger__actions">
          <Button type="submit" variant="primary" disabled={busy}>
            {expense ? 'Save changes' : 'Save expense'}
          </Button>
          {onCancel && (
            <Button variant="dark" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Panel>
  );
}
