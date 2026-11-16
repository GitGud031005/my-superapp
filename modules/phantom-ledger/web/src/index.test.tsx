import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PhantomLedgerModule from './index';

describe('PhantomLedgerModule', () => {
  it('renders inside the p5r-scope wrapper', () => {
    const { container } = render(<PhantomLedgerModule />);
    expect(container.firstElementChild).toHaveClass('p5r-scope');
  });
});
