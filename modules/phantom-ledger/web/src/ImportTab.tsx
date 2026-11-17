import { AwardToast, Banner, Button, Panel, Tag, TextField } from '@superapp/p5r-ds';
import { useState, type ChangeEvent } from 'react';
import { importCsv, type ImportPreview, type MappingEntry } from './api';
import { formatMoney } from './money';

interface Choice {
  action: MappingEntry['action'];
  name: string;
  into: string;
}

const EMPTY: Choice = { action: 'NEW', name: '', into: '' };

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function toMapping(choices: Record<string, Choice>): MappingEntry[] {
  return Object.entries(choices).map(([source, choice]) =>
    choice.action === 'NEW'
      ? { source, action: 'NEW', name: choice.name.trim() }
      : choice.action === 'MERGE'
        ? { source, action: 'MERGE', into: choice.into }
        : { source, action: 'IGNORE' },
  );
}

function isComplete(choices: Record<string, Choice>): boolean {
  return Object.values(choices).every((choice) =>
    choice.action === 'NEW'
      ? choice.name.trim() !== ''
      : choice.action === 'MERGE'
        ? choices[choice.into]?.action === 'NEW'
        : true,
  );
}

export function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [detected, setDetected] = useState<ImportPreview | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [done, setDone] = useState<ImportPreview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function choose(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setDetected(null);
    setPreview(null);
    setDone(null);
    setError('');
  }

  function change(source: string, patch: Partial<Choice>) {
    setChoices((current) => ({ ...current, [source]: { ...current[source], ...patch } }));
    setPreview(null);
  }

  async function run(step: 'detect' | 'preview' | 'confirm') {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      if (step === 'detect') {
        const result = await importCsv('dry-run', file);
        setDetected(result);
        setChoices(Object.fromEntries(result.names.map((name) => [name.name, { ...EMPTY }])));
        setPreview(null);
      } else if (step === 'preview') {
        setPreview(await importCsv('dry-run', file, toMapping(choices)));
      } else {
        setDone(await importCsv('confirm', file, toMapping(choices)));
        setDetected(null);
        setPreview(null);
        setFile(null);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  const importable = preview !== null && preview.ledgerEmpty && preview.groupExpenses + preview.personalExpenses + preview.payments > 0;
  const mergeTargets = Object.entries(choices)
    .filter(([, choice]) => choice.action === 'NEW')
    .map(([source]) => source);

  return (
    <div className="phantom-ledger__stack">
      {done && (
        <AwardToast title="Import finished">
          {done.groupExpenses + done.personalExpenses} expenses, {done.payments} payments, {done.members.length} members
        </AwardToast>
      )}
      <Panel tone="light" title="Import the spreadsheet">
        <div className="phantom-ledger__stack">
          <p>
            In Excel choose File, Save As, <strong>CSV UTF-8 (Comma delimited)</strong>, then pick that file here. You will map every name in
            the sheet to a member before anything is saved, and only an empty ledger can be imported into.
          </p>
          <div className="p5r-field">
            <label className="p5r-field__label" htmlFor="import-file">
              CSV file
            </label>
            <input id="import-file" className="phantom-ledger__file" type="file" accept=".csv,text/csv" onChange={choose} />
          </div>
          {error && (
            <p role="alert" className="phantom-ledger__error">
              Error: {error}
            </p>
          )}
          <div className="phantom-ledger__actions">
            {importable ? (
              <Button variant="primary" onClick={() => void run('confirm')} disabled={busy}>
                Import everything
              </Button>
            ) : detected ? (
              <Button variant="primary" onClick={() => void run('preview')} disabled={busy || !isComplete(choices)}>
                Preview balances
              </Button>
            ) : (
              <Button variant="primary" onClick={() => void run('detect')} disabled={!file || busy}>
                Check file
              </Button>
            )}
            {importable && (
              <Button variant="dark" onClick={() => setPreview(null)} disabled={busy}>
                Edit mapping
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {detected && !importable && (
        <>
          <Banner as="h2" tone="white">
            Map the names
          </Banner>
          <p>
            {detected.groupExpenses} group expenses, {detected.personalExpenses} personal charges and {detected.payments} payments mention{' '}
            {plural(detected.names.length, 'name')}. For each one, type the member it belongs to, merge it into another name, or ignore it.
          </p>
          <div className="phantom-ledger__list">
            {detected.names.map((detectedName) => {
              const choice = choices[detectedName.name] ?? EMPTY;
              const options = mergeTargets.filter((source) => source !== detectedName.name);
              return (
                <Panel key={detectedName.name} tone="light">
                  <fieldset className="phantom-ledger__fieldset">
                    <legend className="phantom-ledger__legend">
                      {detectedName.name} · {plural(detectedName.expenses, 'expense')}, {plural(detectedName.payments, 'payment')}
                    </legend>
                    <div className="p5r-field">
                      <label className="p5r-field__label" htmlFor={`action-${detectedName.name}`}>
                        What is it
                      </label>
                      <select
                        id={`action-${detectedName.name}`}
                        className="p5r-field__control"
                        value={choice.action}
                        onChange={(event) => change(detectedName.name, { action: event.target.value as Choice['action'] })}
                      >
                        <option value="NEW">A member</option>
                        <option value="MERGE">The same person as another name</option>
                        <option value="IGNORE">Not a person, ignore</option>
                      </select>
                    </div>
                    {choice.action === 'NEW' && (
                      <TextField
                        label="Member name"
                        value={choice.name}
                        onChange={(event) => change(detectedName.name, { name: event.target.value })}
                        maxLength={60}
                        autoComplete="off"
                      />
                    )}
                    {choice.action === 'MERGE' && (
                      <div className="p5r-field">
                        <label className="p5r-field__label" htmlFor={`into-${detectedName.name}`}>
                          Merge into
                        </label>
                        <select
                          id={`into-${detectedName.name}`}
                          className="p5r-field__control"
                          value={options.includes(choice.into) ? choice.into : ''}
                          onChange={(event) => change(detectedName.name, { into: event.target.value })}
                        >
                          <option value="">Choose a name</option>
                          {options.map((source) => (
                            <option key={source} value={source}>
                              {source}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </fieldset>
                </Panel>
              );
            })}
          </div>
        </>
      )}

      {preview && (
        <>
          <Banner as="h2" tone="white">
            Preview
          </Banner>
          {!preview.ledgerEmpty && (
            <p role="alert" className="phantom-ledger__error">
              Error: The ledger already has expenses or payments, so this file cannot be imported.
            </p>
          )}
          <p>
            {preview.groupExpenses} group expenses, {preview.personalExpenses} personal charges, {preview.payments} payments and{' '}
            {plural(preview.members.length, 'member')}.
          </p>
          <ul className="phantom-ledger__list">
            {preview.members.map((member) => (
              <li key={member.name} className="phantom-ledger__row">
                <div className="phantom-ledger__row-main">
                  <p className="phantom-ledger__row-title">{member.name}</p>
                  <p className="phantom-ledger__row-sub">
                    {plural(member.expenses, 'expense')}, {plural(member.payments, 'payment')}
                  </p>
                  <Tag tone={member.exists ? 'white' : 'yellow'}>{member.exists ? 'Existing member' : 'New member'}</Tag>
                </div>
                <p className="phantom-ledger__amount">{formatMoney(member.balance)}</p>
              </li>
            ))}
          </ul>
          {preview.ignored.length > 0 && (
            <>
              <h3 className="phantom-ledger__subheading">Ignored names</h3>
              <ul className="phantom-ledger__list">
                {preview.ignored.map((name) => (
                  <li key={name.name} className="phantom-ledger__row">
                    <span>
                      {name.name}: {plural(name.expenses, 'expense')} and {plural(name.payments, 'payment')} dropped
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {preview.problems.length > 0 && (
            <>
              <h3 className="phantom-ledger__subheading">Rows that will be skipped</h3>
              <ul className="phantom-ledger__list">
                {preview.problems.map((problem, index) => (
                  <li key={index} className="phantom-ledger__row">
                    <span>
                      Row {problem.row}: {problem.reason}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}
