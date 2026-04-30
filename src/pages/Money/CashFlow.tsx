import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Tabs, Skeleton } from '../../components/ui';
import { CashFlowBar } from '../../components/charts/CashFlowBar';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';

export default function CashFlow() {
  const [period, setPeriod] = useState<'3m' | '6m' | '12m'>('6m');
  const months = period === '3m' ? 3 : period === '6m' ? 6 : 12;

  const data = useLiveQuery(async () => {
    const results = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d).toISOString().slice(0, 10);
      const end = endOfMonth(d).toISOString().slice(0, 10);
      const txs = await db.transactions.where('date').between(start, end).toArray();
      const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      results.push({ month: format(d, 'yyyy-MM'), income, expenses });
    }
    return results;
  }, [months]);

  const totalIncome = data?.reduce((s, d) => s + d.income, 0) ?? 0;
  const totalExpenses = data?.reduce((s, d) => s + d.expenses, 0) ?? 0;

  return (
    <PageLayout>
      <div className="flex items-center justify-between mb-4">
        <Tabs tabs={[{ id: '3m', label: '3M' }, { id: '6m', label: '6M' }, { id: '12m', label: '12M' }]} activeTab={period} onChange={p => setPeriod(p as any)} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardTitle>Total Income</CardTitle><p className="font-mono text-xl font-bold text-positive mt-1">{formatCurrency(totalIncome, 'AED', 'en-AE', true)}</p></Card>
        <Card><CardTitle>Total Expenses</CardTitle><p className="font-mono text-xl font-bold text-negative mt-1">{formatCurrency(totalExpenses, 'AED', 'en-AE', true)}</p></Card>
        <Card><CardTitle>Net Surplus</CardTitle><p className={`font-mono text-xl font-bold mt-1 ${totalIncome - totalExpenses >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(totalIncome - totalExpenses, 'AED', 'en-AE', true)}</p></Card>
        <Card><CardTitle>Avg Savings Rate</CardTitle><p className="font-mono text-xl font-bold text-accent mt-1">{totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(0) : 0}%</p></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Income vs Expenses</CardTitle></CardHeader>
        {!data ? <Skeleton className="h-60" /> : <CashFlowBar data={data} height={280} />}
      </Card>
    </PageLayout>
  );
}
