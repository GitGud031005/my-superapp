import { Banner, Button, Dialog, Panel, Tag, TextField } from '@superapp/p5r-ds';
import { useCallback, useState, type FormEvent } from 'react';
import {
  createMember,
  createPayment,
  deleteMember,
  deletePayment,
  getMemberHistory,
  listMembers,
  updateMember,
  updatePayment,
  type Line,
  type Member,
} from './api';
import { History } from './History';
import { useLoad } from './hooks';
import { Loaded } from './Loaded';
import { formatMoney, parseAmount, todayIso } from './money';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function BalanceTag({ balance }: { balance: number }) {
  if (balance > 0) return <Tag tone="red">Owes {formatMoney(balance)}</Tag>;
  if (balance < 0) return <Tag tone="yellow">Ahead {formatMoney(-balance)}</Tag>;
  return <Tag tone="white">Settled</Tag>;
}

function MemberForm({ member, onSaved, onCancel }: { member?: Member; onSaved: () => void; onCancel: () => void }) {
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      onSaved();
    } catch (failure) {
      setConfirmingDelete(false);
      setError(errorText(failure));
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Write a name');
      return;
    }
    const input = { name: name.trim(), email: email.trim() };
    void run(() => (member ? updateMember(member.id, input) : createMember(input)));
  }

  return (
    <Panel tone="light" title={member ? 'Edit member' : 'Add member'}>
      <form className="phantom-ledger__stack" onSubmit={submit} noValidate>
        <TextField label="Name" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} />
        <TextField
          label="Google email"
          type="email"
          hint="Optional. When it matches the member's Google account, they see their own ledger."
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
        />
        {error && (
          <p role="alert" className="phantom-ledger__error">
            Error: {error}
          </p>
        )}
        <div className="phantom-ledger__actions">
          <Button type="submit" variant="primary" disabled={busy}>
            Save member
          </Button>
          <Button variant="dark" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          {member && (
            <Button variant="dark" onClick={() => setConfirmingDelete(true)} disabled={busy}>
              Delete member
            </Button>
          )}
        </div>
      </form>
      <Dialog
        open={confirmingDelete}
        title="Delete this member?"
        onClose={() => setConfirmingDelete(false)}
        actions={
          <>
            <Button onClick={() => setConfirmingDelete(false)}>Keep member</Button>
            <Button variant="primary" onClick={() => member && void run(() => deleteMember(member.id))}>
              Delete {member?.name}
            </Button>
          </>
        }
      >
        Only members with no expenses or payments can be deleted.
      </Dialog>
    </Panel>
  );
}

function PaymentForm({ memberId, payment, onSaved, onCancel }: { memberId: string; payment?: Line; onSaved: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState(payment ? String(payment.amount) : '');
  const [date, setDate] = useState(payment?.date ?? todayIso());
  const [note, setNote] = useState(payment?.note ?? 'Paid');
  const [amountError, setAmountError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(amount);
    if (parsed === null || parsed <= 0) {
      setAmountError('Write an amount like 56k, 56000 or 56.000');
      return;
    }
    setAmountError('');
    setError('');
    setBusy(true);
    try {
      const input = { memberId, date, amount: parsed, note: note.trim() };
      await (payment?.id ? updatePayment(payment.id, input) : createPayment(input));
      onSaved();
    } catch (failure) {
      setError(errorText(failure));
      setBusy(false);
    }
  }

  return (
    <Panel tone="light" title={payment ? 'Edit payment' : 'Record payment'}>
      <form className="phantom-ledger__stack" onSubmit={(event) => void submit(event)} noValidate>
        <TextField
          label="Amount"
          hint="56k, 56000 or 56.000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={amountError || undefined}
          autoComplete="off"
        />
        <TextField label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        <TextField label="Note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} />
        {error && (
          <p role="alert" className="phantom-ledger__error">
            Error: {error}
          </p>
        )}
        <div className="phantom-ledger__actions">
          <Button type="submit" variant="primary" disabled={busy}>
            Save payment
          </Button>
          <Button variant="dark" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function MemberDetail({ member, onBack }: { member: Member; onBack: () => void }) {
  const loader = useCallback(() => getMemberHistory(member.id), [member.id]);
  const { load, reload } = useLoad(loader);
  const [form, setForm] = useState<'new' | Line | null>(null);
  const [removing, setRemoving] = useState<Line | null>(null);
  const [error, setError] = useState('');

  async function removePayment() {
    if (!removing?.id) return;
    try {
      await deletePayment(removing.id);
      setRemoving(null);
      setForm(null);
      reload();
    } catch (failure) {
      setRemoving(null);
      setError(errorText(failure));
    }
  }

  return (
    <div className="phantom-ledger__stack">
      <div>
        <Button variant="light" size="sm" onClick={onBack}>
          Back to members
        </Button>
      </div>
      <Loaded load={load} onRetry={reload}>
        {(data) => (
          <>
            <Panel title={data.member.name}>
              <div className="phantom-ledger__stack">
                <p className="phantom-ledger__balance-label">{data.member.balance < 0 ? 'Ahead by' : 'Owes'}</p>
                <p className="phantom-ledger__balance">{formatMoney(Math.abs(data.member.balance))}</p>
                {!form && (
                  <div>
                    <Button variant="primary" onClick={() => setForm('new')}>
                      Record payment
                    </Button>
                  </div>
                )}
              </div>
            </Panel>
            {form && (
              <PaymentForm
                memberId={member.id}
                payment={form === 'new' ? undefined : form}
                onCancel={() => setForm(null)}
                onSaved={() => {
                  setForm(null);
                  reload();
                }}
              />
            )}
            {error && (
              <p role="alert" className="phantom-ledger__error">
                Error: {error}
              </p>
            )}
            <Banner as="h2" tone="white">
              History
            </Banner>
            {data.history.length === 0 ? (
              <p>Nothing has been recorded for this member yet.</p>
            ) : (
              <History
                lines={data.history}
                actions={(line) =>
                  line.kind === 'PAYMENT' && (
                    <div className="phantom-ledger__actions">
                      <Button size="sm" onClick={() => setForm(line)}>
                        Edit
                      </Button>
                      <Button size="sm" onClick={() => setRemoving(line)}>
                        Delete
                      </Button>
                    </div>
                  )
                }
              />
            )}
          </>
        )}
      </Loaded>
      <Dialog
        open={removing !== null}
        title="Delete this payment?"
        onClose={() => setRemoving(null)}
        actions={
          <>
            <Button onClick={() => setRemoving(null)}>Keep payment</Button>
            <Button variant="primary" onClick={() => void removePayment()}>
              Delete payment
            </Button>
          </>
        }
      >
        {removing && `${formatMoney(removing.amount)} paid on ${removing.date} will be removed and ${member.name}'s balance goes up by that amount.`}
      </Dialog>
    </div>
  );
}

export function MembersTab() {
  const { load, reload } = useLoad(listMembers);
  const [editing, setEditing] = useState<Member | 'new' | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);

  if (selected) {
    return (
      <MemberDetail
        key={selected.id}
        member={selected}
        onBack={() => {
          setSelected(null);
          reload();
        }}
      />
    );
  }

  return (
    <div className="phantom-ledger__stack">
      {editing ? (
        <MemberForm
          key={editing === 'new' ? 'new' : editing.id}
          member={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      ) : (
        <div>
          <Button variant="primary" onClick={() => setEditing('new')}>
            Add member
          </Button>
        </div>
      )}
      <Loaded load={load} onRetry={reload}>
        {(members) =>
          members.length === 0 ? (
            <p>No members yet. Add one to get started.</p>
          ) : (
            <ul className="phantom-ledger__list">
              {members.map((member) => (
                <li key={member.id} className="phantom-ledger__row">
                  <div className="phantom-ledger__row-main">
                    <p className="phantom-ledger__row-title">{member.name}</p>
                    <p className="phantom-ledger__row-sub">{member.email ?? 'No email linked'}</p>
                    <BalanceTag balance={member.balance} />
                  </div>
                  <div className="phantom-ledger__actions">
                    <Button size="sm" onClick={() => setSelected(member)}>
                      History
                    </Button>
                    <Button size="sm" onClick={() => setEditing(member)}>
                      Edit
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )
        }
      </Loaded>
    </div>
  );
}
