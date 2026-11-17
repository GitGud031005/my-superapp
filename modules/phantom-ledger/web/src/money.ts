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

export function dateParts(iso: string): { year: number; month: number; day: number; weekday: string } {
  const [year, month, day] = iso.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return { year, month, day, weekday };
}
