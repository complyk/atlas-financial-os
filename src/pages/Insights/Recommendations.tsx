import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';
import { Skeleton, EmptyState } from '../../components/ui';
import { InsightCard } from '../../components/shared/InsightCard';
import { PageLayout } from '../../components/layout/PageLayout';
import { generateRecommendations } from '../../lib/recommendations';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function Recommendations() {
  const data = useLiveQuery(async () => {
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString().slice(0, 10);
    const monthEnd = endOfMonth(now).toISOString().slice(0, 10);
    const [accounts, transactions, goals, liabilities, recurringRules, settings] = await Promise.all([
      db.accounts.filter(a => a.isActive).toArray(),
      db.transactions.where('date').between(monthStart, monthEnd).toArray(),
      db.goals.toArray(),
      db.liabilities.toArray(),
      db.recurringRules.filter(r => r.isActive).toArray(),
      db.settings.get('singleton'),
    ]);
    if (!settings) return [];
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const recs = generateRecommendations({ accounts, transactions, goals, liabilities, recurringRules, settings, monthlyExpenses: expenses });
    return recs.map((r, i) => ({ ...r, id: `rec-${i}` }));
  }, []);

  return (
    <PageLayout>
      {!data ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl"/>)}</div>
      ) : data.length === 0 ? (
        <EmptyState title="No recommendations" description="Your finances look great! Check back later." />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-tertiary">{data.length} recommendation{data.length !== 1 ? 's' : ''}</p>
          {data.map(r => <InsightCard key={r.id} recommendation={r} />)}
        </div>
      )}
    </PageLayout>
  );
}
