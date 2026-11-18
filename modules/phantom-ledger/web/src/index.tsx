import '@superapp/p5r-ds/styles.css';
import { Button, Panel, RansomTitle } from '@superapp/p5r-ds';
import { useEffect, useState } from 'react';
import { fetchMe, signOut, startGoogleSignIn, type Me } from './auth';
import { I18nProvider } from './I18nProvider';
import { useT } from './i18nContext';
import { LangToggle } from './LangToggle';
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
      <div className="phantom-ledger__backdrop" aria-hidden="true">
        <div className="phantom-ledger__bullseye" />
      </div>
      <div className="phantom-ledger__page">
        <header className="phantom-ledger__header">
          <div className="phantom-ledger__account">
            {session.status === 'signed-in' ? (
              <p>
                {t.session.signedInAs} <strong>{session.me.name}</strong>
              </p>
            ) : (
              <span />
            )}
            <div className="phantom-ledger__actions">
              <LangToggle />
              {session.status === 'signed-in' && (
                <Button variant="light" size="sm" onClick={() => void handleSignOut()}>
                  {t.session.signOut}
                </Button>
              )}
            </div>
          </div>
          <div className="phantom-ledger__title">
            <RansomTitle as="h1" text="Phantom Ledger" skin="logo" fit maxSize={72} />
          </div>
        </header>
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
