import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en, vi as vietnamese } from './i18n';
import { LANG_STORAGE_KEY } from './I18nProvider';
import PhantomLedgerModule from './index';
import { respond, stubApi } from './testApi';
import { stubResizeObserver } from './testUtils';

beforeEach(stubResizeObserver);

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

function shape(value: unknown): unknown {
  if (typeof value === 'function') return 'fn';
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, shape(entry)]));
  return 'text';
}

describe('dictionaries', () => {
  it('give Vietnamese every key English has, with the same shape', () => {
    expect(shape(vietnamese)).toEqual(shape(en));
  });

  it('never leave a Vietnamese string empty', () => {
    const empty: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === 'string' && value === '') empty.push(path);
      if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => walk(entry, `${path}.${key}`));
    };
    walk(vietnamese, 'vi');
    expect(empty).toEqual([]);
  });
});

describe('language toggle', () => {
  const signedOut = () => stubApi({ 'GET /api/me': respond(401, { error: 'unauthenticated' }) });

  it('defaults to Vietnamese and sets lang on the module root', async () => {
    signedOut();
    const { container } = render(<PhantomLedgerModule />);

    expect(await screen.findByRole('button', { name: 'Đăng nhập bằng Google' })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('lang', 'vi');
    expect(screen.getByRole('button', { name: 'VI: Tiếng Việt' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches every string to English, sets lang, and remembers the choice', async () => {
    signedOut();
    const { container, unmount } = render(<PhantomLedgerModule />);

    fireEvent.click(await screen.findByRole('button', { name: 'EN: English' }));

    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đăng nhập bằng Google' })).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('button', { name: 'EN: English' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');

    unmount();
    signedOut();
    render(<PhantomLedgerModule />);
    expect(await screen.findByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
  });

  it('marks each button with its own language', async () => {
    signedOut();
    render(<PhantomLedgerModule />);

    expect(await screen.findByRole('button', { name: 'EN: English' })).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('button', { name: 'VI: Tiếng Việt' })).toHaveAttribute('lang', 'vi');
  });

  it('still works when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    signedOut();
    render(<PhantomLedgerModule />);

    fireEvent.click(await screen.findByRole('button', { name: 'EN: English' }));

    expect(screen.getByRole('button', { name: 'Sign in with Google' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('falls back to Vietnamese when the stored value is not a language', async () => {
    localStorage.setItem(LANG_STORAGE_KEY, 'fr');
    signedOut();
    render(<PhantomLedgerModule />);

    expect(await screen.findByRole('button', { name: 'Đăng nhập bằng Google' })).toBeInTheDocument();
  });

  it('renders exactly one h1', async () => {
    signedOut();
    render(<PhantomLedgerModule />);

    await screen.findByRole('button', { name: 'Đăng nhập bằng Google' });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Phantom Ledger');
  });
});
