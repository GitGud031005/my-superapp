import { Button, Dialog, TextField } from '@superapp/p5r-ds';
import { useState, type FormEvent } from 'react';
import { createMember, deleteMember, updateMember, type Member } from './api';
import { errorText } from './errors';
import { FormError } from './FormParts';
import { useT } from './i18nContext';

export function MemberForm({
  member,
  onSaved,
  onDeleted,
  onCancel,
}: {
  member?: Member;
  onSaved: (detail: string) => void;
  onDeleted: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, done: () => void) {
    setBusy(true);
    setError('');
    try {
      await action();
      done();
    } catch (failure) {
      setConfirmingDelete(false);
      setError(`${t.fieldErrorLabel}: ${errorText(t, failure)}`);
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setNameError(t.member.nameRequired);
      return;
    }
    setNameError('');
    const input = { name: name.trim(), email: email.trim() };
    void run(
      () => (member ? updateMember(member.id, input) : createMember(input)),
      () => onSaved(input.name),
    );
  }

  return (
    <>
      <form className="phantom-ledger__stack" onSubmit={submit} noValidate>
        <TextField label={t.member.name} value={name} onChange={(event) => setName(event.target.value)} error={nameError || undefined} maxLength={60} />
        <TextField
          label={t.member.email}
          type="email"
          hint={t.member.emailHint}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
        />
        <FormError message={error} />
        <div className="phantom-ledger__actions">
          <Button type="submit" variant="primary" disabled={busy}>
            {t.member.save}
          </Button>
          <Button variant="light" onClick={onCancel} disabled={busy}>
            {t.cancel}
          </Button>
          {member && (
            <Button variant="light" onClick={() => setConfirmingDelete(true)} disabled={busy}>
              {t.member.delete}
            </Button>
          )}
        </div>
      </form>
      <Dialog
        open={confirmingDelete}
        closeLabel={t.close}
        title={t.member.deleteTitle}
        onClose={() => setConfirmingDelete(false)}
        actions={
          <>
            <Button onClick={() => setConfirmingDelete(false)}>{t.member.keep}</Button>
            <Button variant="primary" disabled={busy} onClick={() => member && void run(() => deleteMember(member.id), onDeleted)}>
              {t.member.deleteNamed(member?.name ?? '')}
            </Button>
          </>
        }
      >
        {t.member.deleteNote}
      </Dialog>
    </>
  );
}
