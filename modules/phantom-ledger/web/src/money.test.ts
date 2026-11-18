import { describe, expect, it } from 'vitest';
import { dateParts, formatDate, formatMoney, parseAmount, shareFromTotal, splitPreview } from './money';

describe('parseAmount', () => {
  it.each([
    ['56k', 56000],
    ['56K', 56000],
    ['56000', 56000],
    ['56.000', 56000],
    ['1.234.567', 1234567],
    ['1,234,567', 1234567],
    ['22.5k', 22500],
    ['22,5k', 22500],
    [' 23k ', 23000],
    ['56.000đ', 56000],
    ['0', 0],
  ])('reads %s as %i', (text, expected) => {
    expect(parseAmount(text)).toBe(expected);
  });

  it.each(['', 'k', 'abc', '5.5', '56.00', '12.3456k', '-5k', '56 000', '5kk'])('rejects "%s"', (text) => {
    expect(parseAmount(text)).toBeNull();
  });
});

describe('shareFromTotal', () => {
  it('splits a total across every share and rounds each share up to the next 1,000đ', () => {
    expect(shareFromTotal(276000, 12)).toBe(23000);
    expect(shareFromTotal(100000, 3)).toBe(34000);
    expect(shareFromTotal(100000, 4)).toBe(25000);
    expect(shareFromTotal(230001, 10)).toBe(24000);
    expect(shareFromTotal(1, 7)).toBe(1000);
  });
});

describe('formatMoney', () => {
  it('uses vi-VN grouping with a đ suffix', () => {
    expect(formatMoney(56000)).toBe('56.000đ');
    expect(formatMoney(1234567)).toBe('1.234.567đ');
    expect(formatMoney(0)).toBe('0đ');
    expect(formatMoney(-5000)).toBe('-5.000đ');
  });
});

describe('dateParts', () => {
  it('reads an ISO date without shifting it by the time zone', () => {
    expect(dateParts('2024-01-09')).toEqual({ year: 2024, month: 1, day: 9, weekday: 'Tue' });
  });

  it('names the weekday in the chosen language', () => {
    expect(dateParts('2024-01-09', 'vi').weekday).toBe('Th 3');
  });
});

describe('splitPreview', () => {
  const people = [
    { id: 'a', shares: 2 },
    { id: 'b', shares: 1 },
  ];

  it('prices every share the same and reports the rounding difference when starting from a total', () => {
    expect(splitPreview(people, 1, 'total', 100000)).toEqual({
      totalShares: 4,
      sharePrice: 25000,
      total: 100000,
      over: 0,
      perPerson: [
        { id: 'a', shares: 2, amount: 50000 },
        { id: 'b', shares: 1, amount: 25000 },
      ],
    });
    expect(splitPreview(people, 0, 'total', 100000)).toMatchObject({ sharePrice: 34000, total: 102000, over: 2000 });
  });

  it('multiplies a per-share price by the shares and never reports a difference', () => {
    expect(splitPreview(people, 1, 'share', 23000)).toMatchObject({ totalShares: 4, sharePrice: 23000, total: 92000, over: 0 });
  });

  it('has nothing to show without shares or a positive amount', () => {
    expect(splitPreview([], 0, 'share', 23000)).toBeNull();
    expect(splitPreview(people, 0, 'share', null)).toBeNull();
    expect(splitPreview(people, 0, 'share', 0)).toBeNull();
  });

  it('agrees with shareFromTotal', () => {
    expect(splitPreview([{ id: 'a', shares: 12 }], 0, 'total', 276000)?.sharePrice).toBe(shareFromTotal(276000, 12));
  });
});

describe('formatDate', () => {
  it('follows the chosen language without shifting the day', () => {
    expect(formatDate('2024-01-09', 'en')).toBe('9 Jan 2024');
    expect(formatDate('2024-01-09', 'vi')).toBe('9 thg 1, 2024');
  });
});
