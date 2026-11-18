import type { Member } from './api';

export function sortByDebt(members: Member[]): Member[] {
  return [...members].sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'vi'));
}

export function ledgerStats(members: Member[]): { totalOwed: number; owing: number; settled: number; ahead: number } {
  return {
    totalOwed: members.reduce((sum, member) => sum + Math.max(member.balance, 0), 0),
    owing: members.filter((member) => member.balance > 0).length,
    settled: members.filter((member) => member.balance === 0).length,
    ahead: members.filter((member) => member.balance < 0).length,
  };
}
