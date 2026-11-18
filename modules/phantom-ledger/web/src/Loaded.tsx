import { Button, Panel } from '@superapp/p5r-ds';
import type { ReactNode } from 'react';
import { errorText } from './errors';
import type { Load } from './hooks';
import { useT } from './i18nContext';

export function Loaded<T>({ load, onRetry, children }: { load: Load<T>; onRetry: () => void; children: (data: T) => ReactNode }) {
  const t = useT();
  if (load.status === 'loading') {
    return (
      <p role="status" className="phantom-ledger__status">
        {t.loading}
      </p>
    );
  }
  if (load.status === 'error') {
    return (
      <Panel title={t.couldntLoad}>
        <div className="phantom-ledger__stack">
          <p>{errorText(t, load.error)}</p>
          <div>
            <Button variant="primary" onClick={onRetry}>
              {t.tryAgain}
            </Button>
          </div>
        </div>
      </Panel>
    );
  }
  return <>{children(load.data)}</>;
}
