import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Skeleton, EmptyState } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';

export default function Subscriptions() {
  const data = useLiveQuery(async () => {
    const [rules, categories] = await Promise.all([
      db.recurringRules.filter(r => r.isActive && r.type === 'expense').toArray(),
      db.categories.toArray(),
    ]);
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
    // Filter to subscription-type categories
    const all = rules; // show all recurring expenses
    return { subs: all, catMap };
  }, []);

  const totalMonthly = data?.subs.reduce((s, r) => s + r.amount, 0) ?? 0;

  return (
    <PageLayout>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Monthly Total</p><p className="font-mono text-xl font-bold text-negative">{formatCurrency(totalMonthly, 'AED', 'en-AE', true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Annual Total</p><p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(totalMonthly * 12, 'AED', 'en-AE', true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Count</p><p className="font-mono text-xl font-bold text-text-primary">{data?.subs.length ?? 0}</p></Card>
      </div>

      {!data ? <Skeleton className="h-64" />
        : data.subs.length === 0 ? <EmptyState title="No recurring expenses" description="Recurring rules will appear here." />
        : (
          <Card>
            <CardHeader><CardTitle>Recurring Expenses</CardTitle></CardHeader>
            <div className="divide-y divide-border">
              {[...data.subs].sort((a, b) => b.amount - a.amount).map(sub => {
                const cat = sub.categoryId ? data.catMap[sub.categoryId] : null;
                return (
                  <div key={sub.id} className="flex items-center justify-between py-3 px-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: cat?.color ? cat.color + '20' : 'var(--color-surface-raised)', color: cat?.color || 'var(--color-text-tertiary)' }}>
                        {sub.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{sub.name}</p>
                        <p className="text-xs text-text-tertiary">{sub.frequency} · {cat?.name || 'Uncategorised'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-negative">{formatCurrency(sub.amount, 'AED', 'en-AE', true)}/mo</p>
                      <p className="text-xs text-text-tertiary">{formatCurrency(sub.amount * 12, 'AED', 'en-AE', true)}/yr</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
    </PageLayout>
  );
}
