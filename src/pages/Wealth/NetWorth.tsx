import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Tabs, Skeleton } from '../../components/ui';
import { NetWorthChart } from '../../components/charts/NetWorthChart';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';

export default function NetWorth() {
  const [range, setRange] = useState<'3m' | '6m' | '1y' | 'all'>('1y');

  const data = useLiveQuery(async () => {
    const [accounts, assets, liabilities, allSnapshots] = await Promise.all([
      db.accounts.filter(a => a.isActive && a.includeInNetWorth).toArray(),
      db.assets.filter(a => a.includeInNetWorth).toArray(),
      db.liabilities.toArray(),
      db.monthlySnapshots.orderBy('yearMonth').toArray(),
    ]);

    const totalAccounts = accounts.reduce((s, a) => s + a.balance, 0);
    const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.outstandingBalance, 0);
    const netWorth = totalAccounts + totalAssets - totalLiabilities;

    let snapshots = allSnapshots;
    const now = new Date();
    if (range === '3m') { const cut = new Date(now); cut.setMonth(now.getMonth() - 3); snapshots = allSnapshots.filter(s => s.yearMonth >= cut.toISOString().slice(0, 7)); }
    else if (range === '6m') { const cut = new Date(now); cut.setMonth(now.getMonth() - 6); snapshots = allSnapshots.filter(s => s.yearMonth >= cut.toISOString().slice(0, 7)); }
    else if (range === '1y') { const cut = new Date(now); cut.setFullYear(now.getFullYear() - 1); snapshots = allSnapshots.filter(s => s.yearMonth >= cut.toISOString().slice(0, 7)); }

    const nwHistory = snapshots.map(s => ({ date: s.yearMonth, netWorth: s.netWorth }));

    return { netWorth, totalAccounts, totalAssets, totalLiabilities, accounts, assets, liabilities, nwHistory };
  }, [range]);

  if (!data) return <PageLayout><Skeleton className="h-64" /></PageLayout>;

  const { netWorth, totalAccounts, totalAssets, totalLiabilities, accounts, assets, liabilities, nwHistory } = data;

  return (
    <PageLayout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Net Worth</p>
          <p className="font-mono text-xl font-bold text-text-primary tabular-nums">{formatCurrency(netWorth, 'AED', 'en-AE', true)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Liquid Cash</p>
          <p className="font-mono text-xl font-bold text-positive tabular-nums">{formatCurrency(totalAccounts, 'AED', 'en-AE', true)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Total Assets</p>
          <p className="font-mono text-xl font-bold text-text-primary tabular-nums">{formatCurrency(totalAccounts + totalAssets, 'AED', 'en-AE', true)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Total Liabilities</p>
          <p className="font-mono text-xl font-bold text-negative tabular-nums">{formatCurrency(totalLiabilities, 'AED', 'en-AE', true)}</p>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Net Worth History</CardTitle>
          <Tabs tabs={[{id:'3m',label:'3M'},{id:'6m',label:'6M'},{id:'1y',label:'1Y'},{id:'all',label:'All'}]} activeTab={range} onChange={r => setRange(r as any)} />
        </CardHeader>
        {nwHistory.length > 1
          ? <NetWorthChart data={nwHistory} height={240} />
          : <div className="h-40 flex items-center justify-center text-sm text-text-tertiary">No snapshot history yet. Snapshots are created monthly.</div>}
      </Card>

      {/* Accounts table */}
      <Card>
        <CardHeader><CardTitle>All Accounts</CardTitle></CardHeader>
        <div className="divide-y divide-border">
          {accounts.map(a => (
            <div key={a.id} className="flex justify-between items-center py-3 px-1">
              <div>
                <p className="text-sm font-medium text-text-primary">{a.name}</p>
                <p className="text-xs text-text-tertiary">{a.provider} · {a.type}</p>
              </div>
              <p className="font-mono text-sm font-semibold text-text-primary">{formatCurrency(a.balance, a.currency || 'AED', 'en-AE', true)}</p>
            </div>
          ))}
          {assets.map(a => (
            <div key={a.id} className="flex justify-between items-center py-3 px-1">
              <div>
                <p className="text-sm font-medium text-text-primary">{a.name}</p>
                <p className="text-xs text-text-tertiary">Asset · {a.type}</p>
              </div>
              <p className="font-mono text-sm font-semibold text-text-primary">{formatCurrency(a.currentValue, a.currency || 'AED', 'en-AE', true)}</p>
            </div>
          ))}
          {liabilities.map(l => (
            <div key={l.id} className="flex justify-between items-center py-3 px-1">
              <div>
                <p className="text-sm font-medium text-text-primary">{l.name}</p>
                <p className="text-xs text-text-tertiary">Liability · {l.type}</p>
              </div>
              <p className="font-mono text-sm font-semibold text-negative">-{formatCurrency(l.outstandingBalance, 'AED', 'en-AE', true)}</p>
            </div>
          ))}
        </div>
      </Card>
    </PageLayout>
  );
}
