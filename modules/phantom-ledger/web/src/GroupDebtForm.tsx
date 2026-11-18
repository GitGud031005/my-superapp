import { Button, Tabs, TextField } from '@superapp/p5r-ds';
import { useState, type FormEvent } from 'react';
import { createExpense, updateExpense, type Expense, type ExpenseInput, type Member } from './api';
import { errorText } from './errors';
import { FormError, MemberPicker, Stepper } from './FormParts';
import { useT } from './i18nContext';
import { formatMoney, parseAmount, splitPreview, todayIso, type Pricing } from './money';

type Errors = { note?: string; participants?: string; amount?: string; server?: string };

export function GroupDebtForm({
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
  const [date, setDate] = useState(expense?.date ?? todayIso());
  const [note, setNote] = useState(expense?.note ?? '');
  const [shares, setShares] = useState<Record<string, number>>(() =>
    Object.fromEntries((expense?.participants ?? []).map((participant) => [participant.memberId, participant.shares])),
  );
  const [ownerShares, setOwnerShares] = useState(expense?.ownerShares ?? 0);
  const [pricing, setPricing] = useState<Pricing>('share');
  const [amountText, setAmountText] = useState(expense ? String(expense.shareAmount) : '');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const picked = members.filter((member) => shares[member.id]);
  const amount = parseAmount(amountText);
  const preview = splitPreview(
    picked.map((member) => ({ id: member.id, shares: shares[member.id] })),
    ownerShares,
    pricing,
    amount,
  );

  function toggle(member: Member) {
    setShares((current) =>
      current[member.id] ? Object.fromEntries(Object.entries(current).filter(([id]) => id !== member.id)) : { ...current, [member.id]: 1 },
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!note.trim()) next.note = t.noteRequired;
    if (picked.length === 0) next.participants = `${t.fieldErrorLabel}: ${t.group.whoRequired}`;
    if (amount === null || amount <= 0) next.amount = t.amountInvalid;
    setErrors(next);
    if (Object.keys(next).length > 0 || amount === null) return;

    const input: ExpenseInput = {
      type: 'GROUP',
      date,
      note: note.trim(),
      participants: picked.map((member) => ({ memberId: member.id, shares: shares[member.id] })),
      ownerShares,
      ...(pricing === 'total' ? { total: amount } : { shareAmount: amount }),
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
      <TextField label={t.date} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      <TextField
        label={t.note}
        hint={t.personal.noteHint}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        error={errors.note}
        maxLength={200}
      />

      <MemberPicker legend={t.group.who} members={members} picked={(id) => Boolean(shares[id])} error={errors.participants} onToggle={toggle} />

      {picked.length > 0 && (
        <ul className="phantom-ledger__list">
          {picked.map((member) => (
            <li key={member.id} className="phantom-ledger__row">
              <span className="phantom-ledger__row-title">{member.name}</span>
              <Stepper
                label={t.group.sharesFor(member.name)}
                fewer={t.group.fewer(t.group.sharesFor(member.name))}
                more={t.group.more(t.group.sharesFor(member.name))}
                value={shares[member.id]}
                min={1}
                onChange={(next) => setShares((current) => ({ ...current, [member.id]: next }))}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="phantom-ledger__row">
        <div className="phantom-ledger__row-main">
          <span className="phantom-ledger__row-title">{t.group.ownerShares}</span>
          <span className="phantom-ledger__row-sub">{t.group.ownerHint}</span>
        </div>
        <Stepper
          label={t.group.ownerSharesLabel}
          fewer={t.group.fewer(t.group.ownerSharesLabel)}
          more={t.group.more(t.group.ownerSharesLabel)}
          value={ownerShares}
          min={0}
          onChange={setOwnerShares}
        />
      </div>

      <Tabs
        label={t.group.pricing}
        items={[
          { id: 'share', label: t.group.perShare },
          { id: 'total', label: t.group.total },
        ]}
        value={pricing}
        onChange={(next) => setPricing(next as Pricing)}
      />
      <TextField
        label={pricing === 'total' ? t.group.total : t.group.perShare}
        hint={t.amountHint}
        value={amountText}
        onChange={(event) => setAmountText(event.target.value)}
        error={errors.amount}
        autoComplete="off"
        inputMode="numeric"
      />

      {preview && amount !== null && (
        <section className="phantom-ledger__preview" aria-label={t.group.preview} aria-live="polite">
          <p className="phantom-ledger__preview-price">
            {t.group.perShareLine(formatMoney(preview.sharePrice))} · {t.group.shareCount(preview.totalShares)}
          </p>
          {pricing === 'total' && (
            <p>
              {t.group.rounded(formatMoney(amount), preview.totalShares, formatMoney(preview.sharePrice))}{' '}
              {preview.over > 0 ? t.group.over(formatMoney(preview.over)) : t.group.exact}
            </p>
          )}
          <ul className="phantom-ledger__split">
            {preview.perPerson.map((person) => (
              <li key={person.id}>
                <span>
                  {members.find((member) => member.id === person.id)?.name} {t.group.personLine(person.shares)}
                </span>
                <span>{formatMoney(person.amount)}</span>
              </li>
            ))}
            {ownerShares > 0 && (
              <li>
                <span>
                  {t.group.ownerLine(ownerShares)} ({t.group.noDebt})
                </span>
                <span>{formatMoney(preview.sharePrice * ownerShares)}</span>
              </li>
            )}
          </ul>
          <p className="phantom-ledger__preview-total">{t.group.totalLine(formatMoney(preview.total))}</p>
        </section>
      )}

      <FormError message={errors.server} />
      <div className="phantom-ledger__actions">
        <Button type="submit" variant="primary" disabled={busy}>
          {expense ? t.group.saveChanges : t.group.save}
        </Button>
        <Button variant="dark" onClick={onCancel} disabled={busy}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
