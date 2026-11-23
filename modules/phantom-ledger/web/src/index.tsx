import '@superapp/p5r-ds/styles.css';
import { Button, Panel } from '@superapp/p5r-ds';
import { useEffect, useState } from 'react';
import { fetchMe, signOut, startGoogleSignIn, type Me } from './auth';
import { Backdrop, Hero, TopBar } from './Chrome';
import { I18nProvider } from './I18nProvider';
import { useT } from './i18nContext';
import { Ledger } from './Ledger';
import './module.css';

type Session = { status: 'loading' } | { status: 'error' } | { status: 'signed-out' } | { status: 'signed-in'; me: Me };

function Module() {
  const t = useT();
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const [signOutFailed, setSignOutFailed] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;
    fetchMe()
      .then((me) => {
        if (!ignore) setSession(me ? { status: 'signed-in', me } : { status: 'signed-out' });
      })
      .catch(() => {
        if (!ignore) setSession({ status: 'error' });
      });
    return () => {
      ignore = true;
    };
  }, [attempt]);

  function retry() {
    setSession({ status: 'loading' });
    setAttempt((count) => count + 1);
  }

  async function handleSignOut() {
    setSignOutFailed(false);
    try {
      await signOut();
      setSession({ status: 'signed-out' });
    } catch {
      setSignOutFailed(true);
    }
  }

  return (
    <>
      <Backdrop />
      <TopBar name={session.status === 'signed-in' ? session.me.name : undefined} onSignOut={() => void handleSignOut()} />
      <div className="phantom-ledger__page">
        <Hero />
        {session.status === 'loading' && (
          <p role="status" className="phantom-ledger__status">
            {t.session.checking}
          </p>
        )}
        {session.status === 'error' && (
          <Panel title={t.session.offlineTitle}>
            <div className="phantom-ledger__stack">
              <p>{t.session.offline}</p>
              <div>
                <Button variant="primary" onClick={retry}>
                  {t.tryAgain}
                </Button>
              </div>
            </div>
          </Panel>
        )}
        {session.status === 'signed-out' && (
          <Panel title={t.session.signInTitle}>
            <div className="phantom-ledger__stack">
              <p>{t.session.signIn}</p>
              <div>
                <Button variant="primary" onClick={startGoogleSignIn}>
                  {t.session.signInButton}
                </Button>
              </div>
            </div>
          </Panel>
        )}
        {session.status === 'signed-in' && (
          <>
            {signOutFailed && (
              <p role="alert" className="phantom-ledger__status">
                {t.session.signOutFailed}
              </p>
            )}
            <Ledger email={session.me.email} />
          </>
        )}
      </div>
    </>
  );
}

export default function PhantomLedgerModule() {
  return (
    <I18nProvider className="p5r-scope phantom-ledger">
      <Module />
    </I18nProvider>
  );
}
