import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LANG_STORAGE_KEY } from './I18nProvider';
import PhantomLedgerModule from './index';
import { respond, stubApi } from './testApi';
import { stubResizeObserver } from './testUtils';

const startGoogleSignIn = vi.hoisted(() => vi.fn());

vi.mock('./auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./auth')>()),
  startGoogleSignIn,
}));

const me = { id: '7d1c', email: 'ada@example.com', name: 'Ada Lovelace', pictureUrl: null };

const unlinked = respond(200, { admin: false, member: null });

beforeEach(stubResizeObserver);

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  startGoogleSignIn.mockReset();
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

function renderModule() {
  localStorage.setItem(LANG_STORAGE_KEY, 'en');
  return render(<PhantomLedgerModule />);
}

describe('PhantomLedgerModule', () => {
  it('renders inside the p5r-scope wrapper', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { container } = render(<PhantomLedgerModule />);
    expect(container.firstElementChild).toHaveClass('p5r-scope');
  });

  it('shows the sign-in screen on 401 and starts the Google redirect', async () => {
    stubApi({ 'GET /api/me': respond(401, { error: 'unauthenticated' }) });
    renderModule();

    fireEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));

    expect(startGoogleSignIn).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows the user name and a sign-out button when signed in', async () => {
    stubApi({ 'GET /api/me': respond(200, me), 'GET /api/ledger/me': unlinked });
    renderModule();

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in with Google' })).not.toBeInTheDocument();
  });

  it('posts the logout with the CSRF header and returns to the sign-in screen', async () => {
    document.cookie = 'XSRF-TOKEN=abc%3D123';
    const fetchMock = stubApi({
      'GET /api/me': respond(200, me),
      'GET /api/ledger/me': unlinked,
      'POST /api/logout': respond(204),
    });
    renderModule();

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/logout', {
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': 'abc=123' },
    });
  });

  it('offers a retry when the server cannot be reached', async () => {
    let attempts = 0;
    stubApi({
      'GET /api/me': () => (attempts++ === 0 ? respond(502) : respond(200, me)),
      'GET /api/ledger/me': unlinked,
    });
    renderModule();

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  });
});
