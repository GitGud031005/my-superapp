import { getMyLedger } from './api';
import { AdminLedger } from './AdminLedger';
import { useLoad } from './hooks';
import { Loaded } from './Loaded';
import { MyLedger, Unlinked } from './MyLedger';

export function Ledger({ email }: { email: string }) {
  const { load, reload } = useLoad(getMyLedger);

  return (
    <Loaded load={load} onRetry={reload}>
      {(ledger) => {
        if (ledger.admin) return <AdminLedger mine={ledger.member} />;
        if (ledger.member) return <MyLedger mine={ledger.member} />;
        return <Unlinked email={email} />;
      }}
    </Loaded>
  );
}
