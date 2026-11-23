import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Expense, Line, Member } from './api';
import { Ledger } from './Ledger';
import { respond, stubApi } from './testApi';
import { renderIn } from './testUtils';

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
  localStorage.clear();
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

const history: Line[] = [
  { id: 'p-1', kind: 'PAYMENT', date: '2024-01-11', note: 'Paid', amount: 25000, balance: 30000 },
  { kind: 'EXPENSE', type: 'PERSONAL', date: '2024-01-10', note: 'Shuttlecocks', amount: 15000, shareAmount: 15000, shares: 1, balance: 55000 },
  {
    kind: 'EXPENSE',
    type: 'GROUP',
    date: '2024-01-09',
    note: 'Court',
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
  { id: 'm-cara', name: 'Cara', email: null, balance: 120000 },
  { id: 'm-dan', name: 'Dan', email: 'dan@example.com', balance: 0 },
  { id: 'm-eli', name: 'Eli', email: null, balance: 30000 },
  { id: 'm-fay', name: 'Fay', email: null, balance: 0 },
];

const expense: Expense = {
  id: 'e-1',
  type: 'GROUP',
  date: '2024-01-09',
  note: 'Court',
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

function adminRoutes(extra: Parameters<typeof stubApi>[0] = {}) {
  return { 'GET /api/ledger/me': adminMe, 'GET /api/ledger/admin/members': respond(200, members), ...extra };
}

function bodyOf(fetchMock: ReturnType<typeof stubApi>, url: string) {
  const init = fetchMock.mock.calls.find(([called, options]) => called === url && options?.body !== undefined)?.[1] as RequestInit;
  return { init, body: JSON.parse(init.body as string) as Record<string, unknown> };
}

const rowNames = () => screen.getAllByRole('rowheader').map((header) => header.textContent);

describe('friend view', () => {
  it('shows the balance big, then the history newest first with the share detail', async () => {
    stubApi({ 'GET /api/ledger/me': respond(200, { admin: false, member: { name: 'Anna', balance: 30000, history } }) });
    renderIn(<Ledger email="anna@example.com" />);

    expect(await screen.findByText('You owe')).toBeInTheDocument();
    expect(screen.getAllByText('30.000đ')[0]).toHaveClass('phantom-ledger__balance');
    const lines = screen.getAllByRole('listitem');
    expect(lines).toHaveLength(3);
    expect(within(lines[0]).getByText('−25.000đ')).toBeInTheDocument();
    expect(within(lines[1]).getByText('Shuttlecocks')).toBeInTheDocument();
    expect(within(lines[2]).getByText('×2 shares of 4 · 20.000đ each')).toBeInTheDocument();
    expect(within(lines[2]).getByText('40.000đ')).toBeInTheDocument();
    expect(within(lines[2]).getByRole('group', { name: 'Tue, 1/9, 2024' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Group debt' })).not.toBeInTheDocument();
  });

  it('reads in Vietnamese by default, with day before month on the date sticker', async () => {
    stubApi({ 'GET /api/ledger/me': respond(200, { admin: false, member: { name: 'Anna', balance: 30000, history } }) });
    renderIn(<Ledger email="anna@example.com" />, 'vi');

    expect(await screen.findByText('Bạn nợ')).toBeInTheDocument();
    expect(screen.getByText('×2 phần trên 4 · 20.000đ mỗi phần')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Th 3, 9/1, 2024' })).toBeInTheDocument();
  });

  it('says so when the account is ahead', async () => {
    stubApi({ 'GET /api/ledger/me': respond(200, { admin: false, member: { name: 'Anna', balance: -5000, history: [] } }) });
    renderIn(<Ledger email="anna@example.com" />);

    expect(await screen.findByText('You are ahead by')).toBeInTheDocument();
    expect(screen.getByText('Nothing has been recorded for you yet.')).toBeInTheDocument();
  });

  it('explains an unlinked account without showing any admin controls', async () => {
    stubApi({ 'GET /api/ledger/me': respond(200, { admin: false, member: null }) });
    renderIn(<Ledger email="stranger@example.com" />);

    expect(await screen.findByText(/No ledger is linked to this account/)).toHaveTextContent('stranger@example.com');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('offers a retry when the ledger cannot be loaded', async () => {
    let attempts = 0;
    stubApi({
      'GET /api/ledger/me': () =>
        attempts++ === 0 ? respond(500) : respond(200, { admin: false, member: { name: 'Anna', balance: 0, history: [] } }),
    });
    renderIn(<Ledger email="anna@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('All settled')).toBeInTheDocument();
  });
});

describe('admin debt table', () => {
  it('sorts the biggest debt first, ties by name, with settled and ahead rows at the bottom', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    await screen.findByRole('table');
    expect(rowNames()).toEqual(['Cara', 'Anna', 'Eli', 'Dan', 'Fay', 'Ben']);
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[0]).getByRole('cell', { name: 'Top 1' })).toBeInTheDocument();
    expect(within(rows[2]).getByRole('cell', { name: 'Top 3' })).toBeInTheDocument();
    expect(within(rows[3]).getByRole('cell', { name: '–' })).toBeInTheDocument();
    expect(within(rows[0]).getByText('120.000đ')).toBeInTheDocument();
    expect(within(rows[5]).getByText('-5.000đ')).toBeInTheDocument();
    expect(within(rows[5]).getByText('Ahead')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Settled')).toBeInTheDocument();
  });

  it('scales each bar to the largest debt', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    await screen.findByRole('table');
    const bars = document.querySelectorAll('[role="meter"]');
    expect(bars).toHaveLength(3);
    expect(bars[0]).toHaveAttribute('aria-valuenow', '120000');
    expect(bars[0]).toHaveAttribute('aria-valuemax', '120000');
    expect(bars[1]).toHaveAttribute('aria-valuenow', '30000');
  });

  it('totals what is owed in the header', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    const stats = await screen.findByRole('region', { name: 'Totals' });
    expect(within(stats).getByText('Total owed').nextElementSibling).toHaveTextContent('180.000đ');
    expect(within(stats).getByText('Still owe').nextElementSibling).toHaveTextContent('3 people');
    expect(within(stats).getByText('Settled').nextElementSibling).toHaveTextContent('2 people');
    expect(within(stats).getByText('Ahead').nextElementSibling).toHaveTextContent('1 person');
  });

  it('hides settled rows with the toggle but keeps people who are ahead', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    await screen.findByRole('table');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide settled' }));

    expect(rowNames()).toEqual(['Cara', 'Anna', 'Eli', 'Ben']);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Hide settled' }));
    expect(rowNames()).toHaveLength(6);
  });

  it('shows the Gmail link as text, never colour alone', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    await screen.findByRole('table');
    const rows = screen.getAllByRole('row').slice(1);
    expect(within(rows[1]).getByText('Linked')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Not linked')).toBeInTheDocument();
  });

  it('offers exactly one primary action and the four debt and member actions', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    await screen.findByRole('table');
    const bar = screen.getByRole('group', { name: 'Actions' });
    expect(within(bar).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Group debt',
      'Personal debt',
      'Add member',
      'All expenses',
    ]);
    expect(document.querySelectorAll('.p5r-btn--primary')).toHaveLength(1);
    expect(within(bar).getByRole('button', { name: 'Group debt' })).toHaveClass('p5r-btn--primary');
  });

  it('invites the admin to add the first member when the ledger is empty', async () => {
    stubApi(adminRoutes({ 'GET /api/ledger/admin/members': respond(200, []) }));
    renderIn(<Ledger email="boss@example.com" />);

    expect(await screen.findByText('Add the first member to start the ledger.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('adds a "My ledger" action when the admin is also a member', async () => {
    stubApi(
      adminRoutes({ 'GET /api/ledger/me': respond(200, { admin: true, member: { name: 'Boss', balance: 0, history: [] } }) }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'My ledger' }));

    expect(await screen.findByText('All settled')).toBeInTheDocument();
  });
});

describe('admin dialogs', () => {
  it('records a payment typed as 56k from a row, with the CSRF header', async () => {
    document.cookie = 'XSRF-TOKEN=token-1';
    const fetchMock = stubApi(adminRoutes({ 'POST /api/ledger/admin/payments': respond(201, { id: 'p-9' }) }));
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Record payment for Anna' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '56k' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/admin/payments', expect.objectContaining({ method: 'POST' })));
    const { init, body } = bodyOf(fetchMock, '/api/ledger/admin/payments');
    expect(body).toMatchObject({ memberId: 'm-anna', amount: 56000, note: 'Paid' });
    expect(init.headers).toMatchObject({ 'X-XSRF-TOKEN': 'token-1' });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved: Anna · 56.000đ');
  });

  it('rejects an unreadable payment amount', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Record payment for Anna' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: 'lots' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByText(/Write an amount like 56k/)).toBeInTheDocument();
  });

  it('shows a localized generic message plus the server detail when saving fails', async () => {
    stubApi(adminRoutes({ 'POST /api/ledger/admin/payments': respond(400, { error: 'The amount is too large' }) }));
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Record payment for Anna' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '56k' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Error: Something went wrong: The amount is too large');
  });

  it('shows one member history with the balance, and edits and deletes a payment', async () => {
    const fetchMock = stubApi(
      adminRoutes({
        'GET /api/ledger/admin/members/m-anna/history': respond(200, { member: members[0], history }),
        'DELETE /api/ledger/admin/payments/p-1': respond(204),
      }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'History of Anna' }));

    expect(await screen.findByText('Owes')).toBeInTheDocument();
    expect(screen.getAllByText('30.000đ').length).toBeGreaterThan(0);
    expect(screen.getByText('Shuttlecocks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit member' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(await screen.findByLabelText('Amount')).toHaveValue('25000');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByText('Shuttlecocks')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete payment' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/ledger/admin/payments/p-1', expect.objectContaining({ method: 'DELETE' })));
  });

  it('previews how a total is split and rounded before saving a group debt', async () => {
    const fetchMock = stubApi(
      adminRoutes({ 'POST /api/ledger/admin/expenses': respond(201, { ...expense, shareAmount: 34000, totalShares: 3, total: 102000 }) }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Group debt' }));
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Court' } });
    fireEvent.click(screen.getByRole('button', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ben' }));
    fireEvent.click(screen.getByRole('button', { name: 'More your own shares' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Total' }));
    fireEvent.change(screen.getByLabelText('Total'), { target: { value: '100k' } });

    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(within(preview).getByText('34.000đ per share · 3 shares')).toBeInTheDocument();
    expect(within(preview).getByText('100.000đ over 3 shares rounds up to 34.000đ each. 2.000đ over the total')).toBeInTheDocument();
    expect(within(preview).getByText('Anna ×1').nextElementSibling).toHaveTextContent('34.000đ');
    expect(within(preview).getByText('Ben ×1').nextElementSibling).toHaveTextContent('34.000đ');
    expect(within(preview).getByText('You ×1 (no debt)')).toBeInTheDocument();
    expect(within(preview).getByText('102.000đ in all')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save debt' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    const { body } = bodyOf(fetchMock, '/api/ledger/admin/expenses');
    expect(body).toMatchObject({
      type: 'GROUP',
      note: 'Court',
      ownerShares: 1,
      total: 100000,
      participants: [
        { memberId: 'm-anna', shares: 1 },
        { memberId: 'm-ben', shares: 1 },
      ],
    });
    expect(body).not.toHaveProperty('shareAmount');
  });

  it('steps shares per person and prices per share', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Group debt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'More shares for Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'More shares for Anna' }));
    expect(screen.getByRole('button', { name: 'Anna' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fewer shares for Anna' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Price per share'), { target: { value: '23.000' } });

    const preview = screen.getByRole('region', { name: 'Preview' });
    expect(within(preview).getByText('23.000đ per share · 3 shares')).toBeInTheDocument();
    expect(within(preview).getByText('Anna ×3').nextElementSibling).toHaveTextContent('69.000đ');
    expect(within(preview).getByText('69.000đ in all')).toBeInTheDocument();
    expect(within(preview).queryByText(/rounds up/)).not.toBeInTheDocument();
  });

  it('says there is no rounding difference when a total divides evenly', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Group debt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ben' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Total' }));
    fireEvent.change(screen.getByLabelText('Total'), { target: { value: '100k' } });

    expect(screen.getByText('100.000đ over 2 shares rounds up to 50.000đ each. No rounding difference.')).toBeInTheDocument();
  });

  it('asks for a note, a participant and an amount before saving a group debt', async () => {
    const fetchMock = stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Group debt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save debt' }));

    expect(await screen.findByText('Error: Pick at least one member')).toBeInTheDocument();
    expect(screen.getByText(/Write an amount like 56k/)).toBeInTheDocument();
    expect(screen.getByText(/Write what this was for/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/ledger/admin/expenses')).toBe(false);
  });

  it('saves a personal debt for one member with a required note', async () => {
    const fetchMock = stubApi(
      adminRoutes({ 'POST /api/ledger/admin/expenses': respond(201, { ...expense, type: 'PERSONAL', note: 'Shuttlecocks', total: 15000 }) }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Personal debt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save debt' }));
    expect(await screen.findByText('Error: Pick a member')).toBeInTheDocument();
    expect(screen.getByText(/Write what this was for/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anna' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ben' }));
    expect(screen.getByRole('button', { name: 'Anna' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '15k' } });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Shuttlecocks' } });
    expect(screen.getByText("15.000đ will be added to Ben's balance.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save debt' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(bodyOf(fetchMock, '/api/ledger/admin/expenses').body).toMatchObject({
      type: 'PERSONAL',
      note: 'Shuttlecocks',
      shareAmount: 15000,
      ownerShares: 0,
      participants: [{ memberId: 'm-ben', shares: 1 }],
    });
  });

  it('closes a dialog with its close button', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add member' }));
    expect(document.querySelector('dialog[open]')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull());
  });

  it('labels the close button in the chosen language', async () => {
    stubApi(adminRoutes());
    renderIn(<Ledger email="boss@example.com" />, 'vi');

    fireEvent.click(await screen.findByRole('button', { name: 'Thêm thành viên' }));

    expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
  });

  it('adds a member', async () => {
    const fetchMock = stubApi(adminRoutes({ 'POST /api/ledger/admin/members': respond(201, { ...members[0], id: 'm-new', name: 'Dara' }) }));
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Add member' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save member' }));
    expect(await screen.findByText(/Write a name/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: ' Dara ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save member' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(bodyOf(fetchMock, '/api/ledger/admin/members').body).toEqual({ name: 'Dara', email: '' });
  });

  it('lists expenses newest first and deletes one after confirming', async () => {
    let listed = 0;
    const fetchMock = stubApi(
      adminRoutes({
        'GET /api/ledger/admin/expenses': () => (listed++ === 0 ? respond(200, [expense]) : respond(200, [])),
        'DELETE /api/ledger/admin/expenses/e-1': respond(204),
      }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'All expenses' }));
    expect(await screen.findByText(/Anna ×2, Ben · you ×1/)).toBeInTheDocument();
    expect(screen.getByText('Newest first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Court' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete expense' }));

    expect(await screen.findByText('No expenses have been recorded yet.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/admin/expenses/e-1', expect.objectContaining({ method: 'DELETE' }));
  });

  it('edits an expense from the list and returns to it', async () => {
    const fetchMock = stubApi(
      adminRoutes({
        'GET /api/ledger/admin/expenses': respond(200, [expense]),
        'PUT /api/ledger/admin/expenses/e-1': respond(200, expense),
      }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'All expenses' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Edit Court' }));

    expect(await screen.findByLabelText('Note')).toHaveValue('Court');
    expect(screen.getByRole('button', { name: 'Anna' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(/Anna ×2, Ben · you ×1/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/ledger/admin/expenses/e-1', expect.objectContaining({ method: 'PUT' }));
  });

  it('does not reopen a dialog when Escape closed it while the save was still running', async () => {
    let finish: (response: Response) => void = () => {};
    stubApi(
      adminRoutes({
        'GET /api/ledger/admin/members/m-anna/history': respond(200, { member: members[0], history }),
        'POST /api/ledger/admin/payments': () => new Promise<Response>((resolve) => (finish = resolve)),
      }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'History of Anna' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Record payment' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '56k' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));
    fireEvent(document.querySelector('dialog[open]') as HTMLDialogElement, new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(document.querySelector('dialog[open]')).toBeNull());

    finish(respond(201, { id: 'p-9' }));

    expect(await screen.findByText('Saved')).toBeInTheDocument();
    expect(document.querySelector('dialog[open]')).toBeNull();
  });

  it('moves focus to the new heading when the dialog content changes', async () => {
    stubApi(adminRoutes({ 'GET /api/ledger/admin/members/m-anna/history': respond(200, { member: members[0], history }) }));
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'History of Anna' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Record payment' }));

    await waitFor(() => expect(document.activeElement).toHaveTextContent('Record payment'));
    expect(document.activeElement?.tagName).toBe('H2');
  });

  it('sends one DELETE when the confirm button is pressed twice', async () => {
    let finish: (response: Response) => void = () => {};
    const fetchMock = stubApi(
      adminRoutes({
        'GET /api/ledger/admin/expenses': respond(200, [expense]),
        'DELETE /api/ledger/admin/expenses/e-1': () => new Promise<Response>((resolve) => (finish = resolve)),
      }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'All expenses' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Court' }));
    const confirm = await screen.findByRole('button', { name: 'Delete expense' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(confirm).toBeDisabled();
    finish(respond(204));
    await waitFor(() => expect(confirm).toBeEnabled());
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1);
  });

  it('does not call a delete failed when only the reload afterwards fails', async () => {
    let listed = 0;
    stubApi(
      adminRoutes({
        'GET /api/ledger/admin/expenses': () => (listed++ === 0 ? respond(200, [expense]) : respond(500)),
        'DELETE /api/ledger/admin/expenses/e-1': respond(204),
      }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'All expenses' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Court' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete expense' }));

    expect(await screen.findByText(/The expense was deleted, but the list could not be reloaded/)).toBeInTheDocument();
    expect(screen.queryByText(/Could not delete that expense/)).not.toBeInTheDocument();
  });

  it('warns that balances may be stale when the refresh after a save fails, and retries', async () => {
    let loaded = 0;
    stubApi(
      adminRoutes({
        'GET /api/ledger/admin/members': () => (loaded++ === 1 ? respond(500) : respond(200, members)),
        'POST /api/ledger/admin/payments': respond(201, { id: 'p-9' }),
      }),
    );
    renderIn(<Ledger email="boss@example.com" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Record payment for Anna' }));
    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '56k' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByText(/Couldn't refresh the balances/)).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.queryByText(/Couldn't refresh the balances/)).not.toBeInTheDocument());
  });
});
