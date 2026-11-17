import { Button, Panel } from '@superapp/p5r-ds';
import type { ReactNode } from 'react';
import type { Load } from './hooks';

export function Loaded<T>({ load, onRetry, children }: { load: Load<T>; onRetry: () => void; children: (data: T) => ReactNode }) {
  if (load.status === 'loading') {
    return (
      <p role="status" className="phantom-ledger__status">
        Loading…
      </p>
    );
  }
  if (load.status === 'error') {
    return (
      <Panel title="Couldn't load">
        <div className="phantom-ledger__stack">
          <p>{load.message}</p>
          <div>
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      </Panel>
    );
  }
  return <>{children(load.data)}</>;
}
