import { Button, TextField } from '@superapp/p5r-ds';
import { useState, type FormEvent } from 'react';
import { createExpense, updateExpense, type Expense, type ExpenseInput, type Member } from './api';
import { errorText } from './errors';
import { FormError, MemberPicker } from './FormParts';
import { useT } from './i18nContext';
import { formatMoney, parseAmount, todayIso } from './money';

type Errors = { note?: string; member?: string; amount?: string; server?: string };

export function PersonalDebtForm({
  members,
  expense,
  onSaved,
  onCancel,
}: {
  members: Member[];
  expense?: Expense;
  onSaved: (detail: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [memberId, setMemberId] = useState(expense?.participants[0]?.memberId ?? '');
  const [date, setDate] = useState(expense?.date ?? todayIso());
  const [note, setNote] = useState(expense?.note ?? '');
  const [amountText, setAmountText] = useState(expense ? String(expense.shareAmount) : '');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const member = members.find((candidate) => candidate.id === memberId);
  const amount = parseAmount(amountText);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!note.trim()) next.note = t.noteRequired;
    if (!member) next.member = `${t.fieldErrorLabel}: ${t.personal.whoRequired}`;
    if (amount === null || amount <= 0) next.amount = t.amountInvalid;
    setErrors(next);
    if (Object.keys(next).length > 0 || !member || amount === null) return;

    const input: ExpenseInput = {
      type: 'PERSONAL',
      date,
      note: note.trim(),
      participants: [{ memberId: member.id, shares: 1 }],
      ownerShares: 0,
      shareAmount: amount,
    };
    setBusy(true);
    try {
      const saved = await (expense ? updateExpense(expense.id, input) : createExpense(input));
      onSaved(`${saved.note} · ${formatMoney(saved.total)}`);
    } catch (failure) {
      setErrors({ server: `${t.fieldErrorLabel}: ${errorText(t, failure)}` });
      setBusy(false);
    }
  }

  return (
    <form className="phantom-ledger__stack" onSubmit={(event) => void submit(event)} noValidate>
      <MemberPicker
        legend={t.personal.who}
        members={members}
        picked={(id) => id === memberId}
        error={errors.member}
        onToggle={(toggled) => setMemberId((current) => (current === toggled.id ? '' : toggled.id))}
      />
      <TextField
        label={t.personal.amount}
        hint={t.amountHint}
        value={amountText}
        onChange={(event) => setAmountText(event.target.value)}
        error={errors.amount}
        autoComplete="off"
        inputMode="numeric"
      />
      <TextField label={t.date} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <TextField
        label={t.note}
        hint={t.personal.noteHint}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        error={errors.note}
        maxLength={200}
      />

      {member && amount !== null && amount > 0 && (
        <p className="phantom-ledger__preview" aria-live="polite">
          {t.personal.preview(formatMoney(amount), member.name)}
        </p>
      )}

      <FormError message={errors.server} />
      <div className="phantom-ledger__actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {expense ? t.personal.saveChanges : t.personal.save}
        </Button>
        <Button variant="dark" onClick={onCancel} disabled={busy}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
