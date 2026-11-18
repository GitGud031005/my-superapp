import { describe, expect, it } from 'vitest';
import type { Member } from './api';
import { ledgerStats, sortByDebt } from './view';

const member = (name: string, balance: number): Member => ({ id: name, name, email: null, balance });

describe('sortByDebt', () => {
  it('puts the biggest debt first, breaks ties by name, then settled, then ahead', () => {
    const sorted = sortByDebt([
      member('Fay', 0),
      member('Ben', -5000),
      member('Eli', 30000),
      member('Cara', 120000),
      member('Dan', 0),
      member('Anna', 30000),
    ]);
    expect(sorted.map((entry) => entry.name)).toEqual(['Cara', 'Anna', 'Eli', 'Dan', 'Fay', 'Ben']);
  });

  it('does not mutate its input', () => {
    const input = [member('B', 1), member('A', 2)];
    sortByDebt(input);
    expect(input.map((entry) => entry.name)).toEqual(['B', 'A']);
  });
});

describe('ledgerStats', () => {
  it('sums only what is owed and counts who owes, who is settled and who is ahead', () => {
    expect(ledgerStats([member('A', 30000), member('B', 120000), member('C', -5000), member('D', 0), member('E', 0)])).toEqual({
      totalOwed: 150000,
      owing: 2,
      settled: 2,
      ahead: 1,
    });
  });
});
