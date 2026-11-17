import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PhantomLedgerModule from './index';

const startGoogleSignIn = vi.hoisted(() => vi.fn());

vi.mock('./auth', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./auth')>()),
  startGoogleSignIn,
}));

const me = { id: '7d1c', email: 'ada@example.com', name: 'Ada Lovelace', pictureUrl: null };

function respond(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
  startGoogleSignIn.mockReset();
  document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

describe('PhantomLedgerModule', () => {
  it('renders inside the p5r-scope wrapper', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const { container } = render(<PhantomLedgerModule />);
    expect(container.firstElementChild).toHaveClass('p5r-scope');
  });

  it('shows the sign-in screen on 401 and starts the Google redirect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(401, { error: 'unauthenticated' })));
    render(<PhantomLedgerModule />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign in with Google' }));

    expect(startGoogleSignIn).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
  });

  it('shows the user name and a sign-out button when signed in', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, me)));
    render(<PhantomLedgerModule />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign in with Google' })).not.toBeInTheDocument();
  });

  it('posts the logout with the CSRF header and returns to the sign-in screen', async () => {
    document.cookie = 'XSRF-TOKEN=abc%3D123';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(200, me))
      .mockResolvedValueOnce(respond(204));
    vi.stubGlobal('fetch', fetchMock);
    render(<PhantomLedgerModule />);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith('/api/logout', {
      method: 'POST',
      headers: { 'X-XSRF-TOKEN': 'abc=123' },
    });
  });

  it('offers a retry when the server cannot be reached', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(respond(502)).mockResolvedValueOnce(respond(200, me));
    vi.stubGlobal('fetch', fetchMock);
    render(<PhantomLedgerModule />);

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
  });
});
