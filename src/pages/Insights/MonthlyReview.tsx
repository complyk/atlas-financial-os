import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Tabs, Skeleton } from '../../components/ui';
import { CashFlowBar } from '../../components/charts/CashFlowBar';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatPercentPlain } from '../../lib/format';

export default function MonthlyReview() {
  const [monthOffset, setMonthOffset] = useState(0);

  const data = useLiveQuery(async () => {
    const targetDate = subMonths(new Date(), monthOffset);
    const monthStart = startOfMonth(targetDate).toISOString().slice(0, 10);
    const monthEnd = endOfMonth(targetDate).toISOString().slice(0, 10);
    const monthLabel = format(targetDate, 'MMMM yyyy');

    const [txs, categories] = await Promise.all([
      db.transactions.where('date').between(monthStart, monthEnd).toArray(),
      db.categories.toArray(),
    ]);

    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const surplus = income - expenses;
    const savingsRate = income > 0 ? surplus / income : 0;

    // Top expense categories
    const catSpend: Record<string, number> = {};
    txs.filter(t => t.type === 'expense' && t.categoryId).forEach(t => {
      catSpend[t.categoryId!] = (catSpend[t.categoryId!] || 0) + t.amount;
    });
    const topCategories = Object.entries(catSpend)
      .map(([id, amount]) => ({ name: catMap[id]?.name || 'Uncategorised', amount, color: catMap[id]?.color }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // Last 6 months bar chart
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(targetDate, i);
      const s = startOfMonth(d).toISOString().slice(0, 10);
      const e = endOfMonth(d).toISOString().slice(0, 10);
      const mTxs = await db.transactions.where('date').between(s, e).toArray();
      chartData.push({
        month: format(d, 'yyyy-MM'),
        income: mTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expenses: mTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
      });
    }

    return { monthLabel, income, expenses, surplus, savingsRate, topCategories, chartData };
  }, [monthOffset]);

  const months = Array.from({length: 12}, (_, i) => ({
    id: String(i),
    label: i === 0 ? 'This month' : format(subMonths(new Date(), i), 'MMM yy'),
  }));

  return (
    <PageLayout>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {months.slice(0, 6).map(m => (
          <button key={m.id} onClick={() => setMonthOffset(Number(m.id))} className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${monthOffset === Number(m.id) ? 'bg-accent text-white' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}>
            {m.label}
          </button>
        ))}
      </div>

      {!data ? <Skeleton className="h-64" /> : (
        <>
          <h2 className="text-lg font-semibold text-text-primary mb-4">{data.monthLabel}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><p className="text-xs text-text-tertiary mb-1">Income</p><p className="font-mono text-xl font-bold text-positive">{formatCurrency(data.income, 'AED', 'en-AE', true)}</p></Card>
            <Card><p className="text-xs text-text-tertiary mb-1">Expenses</p><p className="font-mono text-xl font-bold text-negative">{formatCurrency(data.expenses, 'AED', 'en-AE', true)}</p></Card>
            <Card><p className="text-xs text-text-tertiary mb-1">Surplus</p><p className={`font-mono text-xl font-bold ${data.surplus >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(data.surplus, 'AED', 'en-AE', true)}</p></Card>
            <Card><p className="text-xs text-text-tertiary mb-1">Savings Rate</p><p className="font-mono text-xl font-bold text-accent">{formatPercentPlain(data.savingsRate)}</p></Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Top Expense Categories</CardTitle></CardHeader>
              {data.topCategories.length === 0 ? <p className="text-sm text-text-tertiary text-center py-6">No expenses this month</p> : (
                <div className="space-y-3">
                  {data.topCategories.map(cat => (
                    <div key={cat.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary">{cat.name}</span>
                        <span className="font-mono font-semibold text-text-primary">{formatCurrency(cat.amount, 'AED', 'en-AE', true)}</span>
                      </div>
                      <div className="h-1 bg-surface-raised rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${data.expenses > 0 ? (cat.amount / data.expenses * 100) : 0}%`, background: cat.color || 'var(--color-accent)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <CardHeader><CardTitle>6-Month Trend</CardTitle></CardHeader>
              <CashFlowBar data={data.chartData} height={200} />
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}
