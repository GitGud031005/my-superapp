import { csrfToken } from './auth';

export type ExpenseType = 'PERSONAL' | 'GROUP';

export interface Line {
  id?: string;
  kind: 'EXPENSE' | 'PAYMENT';
  type?: ExpenseType;
  date: string;
  note: string;
  amount: number;
  shareAmount?: number;
  shares?: number;
  totalShares?: number;
  balance: number;
}

export interface Mine {
  name: string;
  balance: number;
  history: Line[];
}

export interface MyLedger {
  admin: boolean;
  member: Mine | null;
}

export interface Member {
  id: string;
  name: string;
  email: string | null;
  balance: number;
}

export interface MemberHistory {
  member: Member;
  history: Line[];
}

export interface Participant {
  memberId: string;
  name: string;
  shares: number;
}

export interface Expense {
  id: string;
  type: ExpenseType;
  date: string;
  note: string;
  shareAmount: number;
  ownerShares: number;
  totalShares: number;
  total: number;
  participants: Participant[];
}

export interface ExpenseInput {
  type: ExpenseType;
  date: string;
  note: string;
  participants: { memberId: string; shares: number }[];
  ownerShares: number;
  shareAmount?: number;
  total?: number;
}

export interface Payment {
  id: string;
  memberId: string;
  date: string;
  amount: number;
  note: string;
}

export interface PaymentInput {
  memberId: string;
  date: string;
  amount: number;
  note: string;
}

export interface DetectedName {
  name: string;
  expenses: number;
  payments: number;
}

export interface MappingEntry {
  source: string;
  action: 'NEW' | 'MERGE' | 'IGNORE';
  name?: string;
  into?: string;
}

export interface ImportMember {
  name: string;
  exists: boolean;
  expenses: number;
  payments: number;
  balance: number;
}

export interface ImportPreview {
  ledgerEmpty: boolean;
  groupExpenses: number;
  personalExpenses: number;
  payments: number;
  names: DetectedName[];
  members: ImportMember[];
  ignored: DetectedName[];
  problems: { row: number; reason: string }[];
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, url: string, body?: BodyInit | null, json?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-XSRF-TOKEN'] = csrfToken();
  if (json !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {
    method,
    headers,
    body: json !== undefined ? JSON.stringify(json) : body,
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, detail?.error ?? `${method} ${url} failed with ${response.status}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

const ADMIN = '/api/ledger/admin';

export const getMyLedger = () => request<MyLedger>('GET', '/api/ledger/me');
export const listMembers = () => request<Member[]>('GET', `${ADMIN}/members`);
export const createMember = (input: { name: string; email: string }) => request<Member>('POST', `${ADMIN}/members`, null, input);
export const updateMember = (id: string, input: { name: string; email: string }) =>
  request<Member>('PUT', `${ADMIN}/members/${id}`, null, input);
export const deleteMember = (id: string) => request<void>('DELETE', `${ADMIN}/members/${id}`);
export const getMemberHistory = (id: string) => request<MemberHistory>('GET', `${ADMIN}/members/${id}/history`);
export const listExpenses = (limit: number, offset: number) => request<Expense[]>('GET', `${ADMIN}/expenses?limit=${limit}&offset=${offset}`);
export const createExpense = (input: ExpenseInput) => request<Expense>('POST', `${ADMIN}/expenses`, null, input);
export const updateExpense = (id: string, input: ExpenseInput) => request<Expense>('PUT', `${ADMIN}/expenses/${id}`, null, input);
export const deleteExpense = (id: string) => request<void>('DELETE', `${ADMIN}/expenses/${id}`);
export const createPayment = (input: PaymentInput) => request<Payment>('POST', `${ADMIN}/payments`, null, input);
export const updatePayment = (id: string, input: PaymentInput) => request<Payment>('PUT', `${ADMIN}/payments/${id}`, null, input);
export const deletePayment = (id: string) => request<void>('DELETE', `${ADMIN}/payments/${id}`);

export function importCsv(step: 'dry-run' | 'confirm', file: File, mapping?: MappingEntry[]): Promise<ImportPreview> {
  const form = new FormData();
  form.append('file', file);
  if (mapping) form.append('mapping', new Blob([JSON.stringify(mapping)], { type: 'application/json' }));
  return request<ImportPreview>('POST', `${ADMIN}/import/${step}`, form);
}
