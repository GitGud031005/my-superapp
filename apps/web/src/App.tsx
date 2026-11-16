import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router';
import { Home } from './Home';

const PhantomLedger = lazy(() => import('@superapp/phantom-ledger-web'));

export function App() {
  return (
    <>
      <header className="shell-header">
        <Link to="/" className="shell-brand">
          my-superapp
        </Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/ledger/*"
            element={
              <Suspense fallback={<p className="shell-status">Loading…</p>}>
                <PhantomLedger />
              </Suspense>
            }
          />
        </Routes>
      </main>
    </>
  );
}
