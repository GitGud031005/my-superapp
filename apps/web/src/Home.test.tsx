import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { Home } from './Home';

describe('Home', () => {
  it('links to the ledger module', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Phantom Ledger' })).toHaveAttribute('href', '/ledger');
  });
});
