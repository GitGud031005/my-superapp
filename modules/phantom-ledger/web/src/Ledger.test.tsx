import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Expense, Line, Member } from './api';
import { Ledger } from './Ledger';
import { respond, stubApi } from './testApi';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

const history: Line[] = [
  { kind: 'PAYMENT', date: '2024-01-11', note: 'Paid', amount: 25000, balance: 30000 },
  { kind: 'EXPENSE', type: 'PERSONAL', date: '2024-01-10', note: 'Shuttlecocks', amount: 15000, shareAmount: 15000, shares: 1, balance: 55000 },
  {
    kind: 'EXPENSE',
    type: 'GROUP',
    date: '2024-01-09',
    note: 'Badminton',
    amount: 40000,
    shareAmount: 20000,
    shares: 2,
    totalShares: 4,
    balance: 40000,
  },
];

const members: Member[] = [
  { id: 'm-anna', name: 'Anna', email: 'anna@example.com', balance: 30000 },
  { id: 'm-ben', name: 'Ben', email: null, balance: -5000 },
];

const expense: Expense = {
  id: 'e-1',
  type: 'GROUP',
  date: '2024-01-09',
  note: 'Badminton',
  shareAmount: 20000,
  ownerShares: 1,
  totalShares: 4,
  total: 80000,
  participants: [
    { memberId: 'm-anna', name: 'Anna', shares: 2 },
    { memberId: 'm-ben', name: 'Ben', shares: 1 },
  ],
};

const adminMe = respond(200, { admin: true, member: null });

describe('friend view', () => {
  it('shows the balance big, then the history newest first with the share detail', async () => {
    stubApi({ 'GET /api/ledger/me': respond(200, { admin: false, member: { name: 'Anna', balance: 30000, history } }) });
    render(<Ledger email="anna@example.com" />);

    expect(await screen.findByText('You owe')).toBeInTheDocument();
    expect(screen.getAllByText('30.000đ')[0]).toHaveClass('phantom-ledger__balance');
    const lines = screen.getAllByRole('listitem');
    expect(lines).toHaveLength(3);
    expect(within(lines[0]).getByText('−25.000đ')).toBeInTheDocument();
    expect(within(lines[1]).getByText('Shuttlecocks')).toBeInTheDocument();
    expect(within(lines[2]).getByText('×2 shares of 4 · 20.000đ each')).toBeInTheDocument();
    expect(within(lines[2]).getByText('40.000đ')).toBeInTheDocument();
    expect(within(lines[2]).getByRole('group', { name: 'Tue, 1/9, 2024' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('says so when the account is ahead', async () => {
    stubApi({ 'GET /api/ledger/me': respond(200, { admin: false, member: { name: 'Anna', balance: -5000, history: [] } }) });
    render(<Ledger email="anna@example.com" />);

    expect(await screen.findByText('You are ahead by')).toBeInTheDocument();
    expect(screen.getByText('Nothing has been recorded for you yet.')).toBeInTheDocument();
  });

  it('explains an unlinked account without showing any admin tabs', async () => {
    stubApi({ 'GET /api/ledger/me': respond(200, { admin: false, member: null }) });
    render(<Ledger email="stranger@example.com" />);

    expect(await screen.findByText(/No ledger is linked to this account/)).toHaveTextContent('stranger@example.com');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('offers a retry when the ledger cannot be loaded', async () => {
    let attempts = 0;
    stubApi({
      'GET /api/ledger/me': () =>
        attempts++ === 0 ? respond(500) : respond(200, { admin: false, member: { name: 'Anna', balance: 0, history: [] } }),
    });
    render(<Ledger email="anna@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('All settled')).toBeInTheDocument();
  });
});

describe('admin view', () => {
  it('shows the three admin tabs, opening on Members', async () => {
    stubApi({ 'GET /api/ledger/me': adminMe, 'GET /api/ledger/admin/members': respond(200, members) });
    render(<Ledger email="boss@example.com" />);

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Members', 'Add expense', 'Expenses']);
    expect(await screen.findByText('Anna')).toBeInTheDocument();
    expect(screen.getByText('Owes 30.000đ')).toBeInTheDocument();
    expect(screen.getByText('Ahead 5.000đ')).toBeInTheDocument();
    expect(screen.getByText('No email linked')).toBeInTheDocument();
  });

  it('adds a "My ledger" tab when the admin is also a member', async () => {
    stubApi({
      'GET /api/ledger/me': respond(200, { admin: true, member: { name: 'Boss', balance: 0, history: [] } }),
      'GET /api/ledger/admin/members': respond(200, members),
    });
    render(<Ledger email="boss@example.com" />);

    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Members', 'Add expense', 'Expenses', 'My ledger']);
  });

  it('records a payment typed as 56k with the CSRF header', async () => {
    document.cookie = 'XSRF-TOKEN=token-1';
    const fetchMock = stubApi({
      'GET /api/ledger/me': adminMe,
      'GET /api/ledger/admin/members': respond(200, members),
      'GET /api/ledger/admin/members/m-anna/history': respond(200, { member: members[0], history }),
      'POST /api/ledger/admin/payments': respond(201, { id: 'p-1' }),
    });
    render(<Ledger email="boss@example.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'History' }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Record payment' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '56k' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/admin/payments', expect.objectContaining({ method: 'POST' })));
    const init = fetchMock.mock.calls.find(([url]) => url === '/api/ledger/admin/payments')?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toMatchObject({ memberId: 'm-anna', amount: 56000, note: 'Paid' });
    expect(init.headers).toMatchObject({ 'X-XSRF-TOKEN': 'token-1' });
  });

  it('rejects an unreadable payment amount', async () => {
    stubApi({
      'GET /api/ledger/me': adminMe,
      'GET /api/ledger/admin/members': respond(200, members),
      'GET /api/ledger/admin/members/m-anna/history': respond(200, { member: members[0], history }),
    });
    render(<Ledger email="boss@example.com" />);

    fireEvent.click((await screen.findAllByRole('button', { name: 'History' }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Record payment' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: 'lots' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByText(/Write an amount like 56k/)).toBeInTheDocument();
  });

  it('previews how a total is split and rounded before saving a group expense', async () => {
    const fetchMock = stubApi({
      'GET /api/ledger/me': adminMe,
      'GET /api/ledger/admin/members': respond(200, members),
      'POST /api/ledger/admin/expenses': respond(201, { ...expense, shareAmount: 34000, totalShares: 3, total: 102000 }),
    });
    render(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Add expense' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ben' }));
    fireEvent.click(screen.getByRole('button', { name: 'More your own shares' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Total' }));
    fireEvent.change(screen.getByLabelText('Total'), { target: { value: '100k' } });

    expect(screen.getByText('100.000đ over 3 shares rounds up to 34.000đ each, 102.000đ in all (2.000đ over).')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText('Expense saved')).toBeInTheDocument();
    const init = fetchMock.mock.calls.find(([url]) => url === '/api/ledger/admin/expenses')?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toMatchObject({
      type: 'GROUP',
      note: 'Badminton',
      ownerShares: 1,
      total: 100000,
      participants: [
        { memberId: 'm-anna', shares: 1 },
        { memberId: 'm-ben', shares: 1 },
      ],
    });
    expect(JSON.parse(init.body as string)).not.toHaveProperty('shareAmount');
  });

  it('steps shares per person and prices per share', async () => {
    stubApi({ 'GET /api/ledger/me': adminMe, 'GET /api/ledger/admin/members': respond(200, members) });
    render(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Add expense' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'More shares for Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'More shares for Anna' }));
    expect(screen.getByRole('button', { name: 'Anna' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fewer shares for Anna' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Price per share'), { target: { value: '23.000' } });

    expect(screen.getByText('3 shares × 23.000đ = 69.000đ in all.')).toBeInTheDocument();
  });

  it('asks for a participant and an amount before saving', async () => {
    const fetchMock = stubApi({ 'GET /api/ledger/me': adminMe, 'GET /api/ledger/admin/members': respond(200, members) });
    render(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Add expense' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText('Error: Pick at least one member')).toBeInTheDocument();
    expect(screen.getByText(/Write an amount like 56k/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/ledger/admin/expenses')).toBe(false);
  });

  it('lists expenses newest first and deletes one after confirming', async () => {
    let listed = 0;
    const fetchMock = stubApi({
      'GET /api/ledger/me': adminMe,
      'GET /api/ledger/admin/members': respond(200, members),
      'GET /api/ledger/admin/expenses': () => (listed++ === 0 ? respond(200, [expense]) : respond(200, [])),
      'DELETE /api/ledger/admin/expenses/e-1': respond(204),
    });
    render(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Expenses' }));
    expect(await screen.findByText(/Anna ×2, Ben · you ×1/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete expense' }));

    expect(await screen.findByText(/No expenses have been recorded/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/admin/expenses/e-1', expect.objectContaining({ method: 'DELETE' }));
  });
});
