import { Button, Tag } from '@superapp/p5r-ds';
import type { Member } from './api';

export function Stepper({
  label,
  fewer,
  more,
  value,
  min,
  onChange,
}: {
  label: string;
  fewer: string;
  more: string;
  value: number;
  min: number;
  onChange: (next: number) => void;
}) {
  return (
    <div role="group" aria-label={label} className="phantom-ledger__stepper">
      <Button variant="dark" size="sm" aria-label={fewer} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </Button>
      <output aria-label={label} className="phantom-ledger__stepper-value">
        {value}
      </output>
      <Button variant="dark" size="sm" aria-label={more} onClick={() => onChange(value + 1)}>
        +
      </Button>
    </div>
  );
}

export function MemberPicker({
  legend,
  members,
  picked,
  error,
  onToggle,
}: {
  legend: string;
  members: Member[];
  picked: (id: string) => boolean;
  error?: string;
  onToggle: (member: Member) => void;
}) {
  return (
    <fieldset className="phantom-ledger__fieldset">
      <legend className="phantom-ledger__legend">{legend}</legend>
      <div className="phantom-ledger__toggles">
        {members.map((member) => {
          const on = picked(member.id);
          return (
            <button key={member.id} type="button" className="phantom-ledger__toggle" aria-pressed={on} onClick={() => onToggle(member)}>
              <Tag tone={on ? 'cyan' : 'black'}>
                {on && <span aria-hidden="true">✓ </span>}
                {member.name}
              </Tag>
            </button>
          );
        })}
      </div>
      {error && <p className="phantom-ledger__error">{error}</p>}
    </fieldset>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="phantom-ledger__error">
      {message}
    </p>
  );
}
