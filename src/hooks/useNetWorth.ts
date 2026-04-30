import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';

export function useNetWorth() {
  return useLiveQuery(async () => {
    const [accounts, assets, liabilities] = await Promise.all([
      db.accounts.filter(a => a.isActive && a.includeInNetWorth).toArray(),
      db.assets.filter(a => a.includeInNetWorth).toArray(),
      db.liabilities.toArray(),
    ]);
    const totalAccounts = accounts.reduce((s, a) => s + a.balance, 0);
    const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0);
    const totalLiabilities = liabilities.reduce((s, l) => s + l.outstandingBalance, 0);
    const netWorth = totalAccounts + totalAssets - totalLiabilities;
    return { netWorth, totalAccounts, totalAssets, totalLiabilities };
  }, []);
}
