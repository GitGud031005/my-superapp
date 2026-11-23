import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { isImmersive } from './modules';

vi.mock('@superapp/phantom-ledger-web', () => ({ default: () => <p>ledger module</p> }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('shows the shell header on the home route', () => {
    renderAt('/');
    expect(screen.getByRole('banner')).toHaveTextContent('my-superapp');
  });

  it('hides the shell header on an immersive module route and keeps main', async () => {
    renderAt('/ledger');
    expect(await screen.findByText('ledger module')).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});

describe('isImmersive', () => {
  it('is true only for a module that opted in, and its sub-routes', () => {
    expect(isImmersive('/ledger')).toBe(true);
    expect(isImmersive('/ledger/anything')).toBe(true);
    expect(isImmersive('/')).toBe(false);
    expect(isImmersive('/ledgerish')).toBe(false);
  });
});
