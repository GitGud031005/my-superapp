import type { Lang } from './i18n';

const VND = new Intl.NumberFormat('vi-VN');

const ROUNDING = 1000;

export function formatMoney(amount: number): string {
  return `${VND.format(amount)}đ`;
}

export function parseAmount(input: string): number | null {
  const text = input.trim().replace(/\s*(đ|d|vnd)$/i, '');
  const thousands = /^(\d{1,12})(?:[.,](\d{1,3}))?k$/i.exec(text);
  if (thousands) return Number(thousands[1]) * 1000 + Number((thousands[2] ?? '').padEnd(3, '0'));
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(text)) return Number(text.replace(/[.,]/g, ''));
  if (/^\d{1,15}$/.test(text)) return Number(text);
  return null;
}

export function shareFromTotal(total: number, totalShares: number): number {
  const evenSplit = Math.ceil(total / totalShares);
  return Math.ceil(evenSplit / ROUNDING) * ROUNDING;
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const LOCALE = { vi: 'vi-VN', en: 'en-GB' } as const;

function utcDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(iso: string, lang: Lang): string {
  return utcDate(iso).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function dateParts(iso: string, lang: Lang = 'en'): { year: number; month: number; day: number; weekday: string } {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = utcDate(iso).toLocaleDateString(LOCALE[lang], { weekday: 'short', timeZone: 'UTC' });
  return { year, month, day, weekday };
}

export type Pricing = 'share' | 'total';

export interface SplitPreview {
  totalShares: number;
  sharePrice: number;
  total: number;
  over: number;
  perPerson: { id: string; shares: number; amount: number }[];
}

export function splitPreview(
  people: { id: string; shares: number }[],
  ownerShares: number,
  pricing: Pricing,
  amount: number | null,
): SplitPreview | null {
  const totalShares = people.reduce((sum, person) => sum + person.shares, 0) + ownerShares;
  if (amount === null || amount <= 0 || totalShares === 0) return null;
  const sharePrice = pricing === 'total' ? shareFromTotal(amount, totalShares) : amount;
  const total = sharePrice * totalShares;
  return {
    totalShares,
    sharePrice,
    total,
    over: pricing === 'total' ? total - amount : 0,
    perPerson: people.map((person) => ({ ...person, amount: sharePrice * person.shares })),
  };
}
