import { useEffect, useState } from 'react';

export type Load<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

export function useLoad<T>(loader: () => Promise<T>): { load: Load<T>; reload: () => void; refresh: () => void } {
  const [load, setLoad] = useState<Load<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    loader()
      .then((data) => {
        if (!ignore) setLoad({ status: 'ready', data });
      })
      .catch((error: unknown) => {
        if (ignore) return;
        const message = error instanceof Error ? error.message : 'Something went wrong.';
        setLoad((current) => (current.status === 'ready' ? current : { status: 'error', message }));
      });
    return () => {
      ignore = true;
    };
  }, [loader, attempt]);

  return {
    load,
    reload: () => {
      setLoad({ status: 'loading' });
      setAttempt((count) => count + 1);
    },
    refresh: () => setAttempt((count) => count + 1),
  };
}
