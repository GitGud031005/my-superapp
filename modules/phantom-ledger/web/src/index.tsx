import '@superapp/p5r-ds/styles.css';
import { Banner, Button, Panel } from '@superapp/p5r-ds';
import { useEffect, useState } from 'react';
import { fetchMe, signOut, startGoogleSignIn, type Me } from './auth';
import { Ledger } from './Ledger';
import './module.css';

type Session = { status: 'loading' } | { status: 'error' } | { status: 'signed-out' } | { status: 'signed-in'; me: Me };

export default function PhantomLedgerModule() {
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
    <div className="p5r-scope phantom-ledger">
      <div className="phantom-ledger__page">
        <Banner as="h1">Phantom Ledger</Banner>
        {session.status === 'loading' && (
          <p role="status" className="phantom-ledger__status">
            Checking your session…
          </p>
        )}
        {session.status === 'error' && (
          <Panel title="Offline">
            <div className="phantom-ledger__stack">
              <p>Can't reach the server. It may be waking up, so try again in a minute.</p>
              <div>
                <Button variant="primary" onClick={retry}>
                  Try again
                </Button>
              </div>
            </div>
          </Panel>
        )}
        {session.status === 'signed-out' && (
          <Panel title="Sign in">
            <div className="phantom-ledger__stack">
              <p>Sign in with your Google account to open the ledger.</p>
              <div>
                <Button variant="primary" onClick={startGoogleSignIn}>
                  Sign in with Google
                </Button>
              </div>
            </div>
          </Panel>
        )}
        {session.status === 'signed-in' && (
          <>
            <div className="phantom-ledger__account">
              <p>
                Signed in as <strong>{session.me.name}</strong>
              </p>
              <Button variant="light" size="sm" onClick={() => void handleSignOut()}>
                Sign out
              </Button>
            </div>
            {signOutFailed && (
              <p role="alert" className="phantom-ledger__status">
                Couldn't sign you out. Try again.
              </p>
            )}
            <Ledger email={session.me.email} />
          </>
        )}
      </div>
    </div>
  );
}
