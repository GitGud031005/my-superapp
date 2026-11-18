import { useEffect, useState } from 'react';

export type Load<T> = { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T };

export function useLoad<T>(loader: () => Promise<T>): { load: Load<T>; stale: boolean; reload: () => void; refresh: () => void } {
  const [load, setLoad] = useState<Load<T>>({ status: 'loading' });
  const [stale, setStale] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    loader()
      .then((data) => {
        if (ignore) return;
        setLoad({ status: 'ready', data });
        setStale(false);
      })
      .catch((error: unknown) => {
        if (ignore) return;
        setLoad((current) => (current.status === 'ready' ? current : { status: 'error', error }));
        setStale(true);
      });
    return () => {
      ignore = true;
    };
  }, [loader, attempt]);

  return {
    load,
    stale,
    reload: () => {
      setLoad({ status: 'loading' });
      setAttempt((count) => count + 1);
    },
    refresh: () => setAttempt((count) => count + 1),
  };
}
