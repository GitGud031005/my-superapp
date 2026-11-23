import { Button, TextField } from '@superapp/p5r-ds';
import { useState, type FormEvent } from 'react';
import { createPayment, updatePayment, type Line, type Member } from './api';
import { errorText } from './errors';
import { FormError } from './FormParts';
import { useT } from './i18nContext';
import { formatMoney, parseAmount, todayIso } from './money';

export function PaymentForm({
  member,
  payment,
  onSaved,
  onCancel,
}: {
  member: Member;
  payment?: Line;
  onSaved: (detail: string) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [date, setDate] = useState(payment?.date ?? todayIso());
  const [note, setNote] = useState(payment?.note ?? t.payment.defaultNote);
  const [amountError, setAmountError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) {
      setAmountError(t.amountInvalid);
      return;
    }
    setAmountError('');
    setError('');
    setBusy(true);
    try {
      const input = { memberId: member.id, date, amount: parsed, note: note.trim() };
      await (payment?.id ? updatePayment(payment.id, input) : createPayment(input));
      onSaved(`${member.name} · ${formatMoney(parsed)}`);
    } catch (failure) {
      setError(`${t.fieldErrorLabel}: ${errorText(t, failure)}`);
      setBusy(false);
    }
  }

  return (
    <form className="phantom-ledger__stack" onSubmit={(event) => void submit(event)} noValidate>
      <p className="phantom-ledger__row-title">{member.name}</p>
      <TextField
        label={t.payment.amount}
        hint={t.amountHint}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        error={amountError || undefined}
        autoComplete="off"
        inputMode="numeric"
      />
      <TextField label={t.date} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <TextField label={t.note} value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
      <FormError message={error} />
      <div className="phantom-ledger__actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {t.payment.save}
        </Button>
        <Button variant="light" onClick={onCancel} disabled={busy}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
