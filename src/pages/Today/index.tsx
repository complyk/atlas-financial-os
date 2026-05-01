import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Badge, Skeleton } from '../../components/ui';
import { NetWorthChart } from '../../components/charts/NetWorthChart';
import { GoalGauge } from '../../components/charts/GoalGauge';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatMonths } from '../../lib/format';
import { startOfMonth, endOfMonth, subMonths, addDays } from 'date-fns';
import { generateRecommendations } from '../../lib/recommendations';
import { useAppStore } from '../../stores/useAppStore';

export default function Today() {
  const { currency, locale } = useAppStore();
  const data = useLiveQuery(async () => {
    const [accounts, assets, liabilities, goals, recurringRules, settings] = await Promise.all([
      db.accounts.filter(a => a.isActive).toArray(),
      db.assets.filter(a => a.includeInNetWorth).toArray(),
      // includeInNetWorth defaults to true when undefined for back-compat
      db.liabilities.filter(l => l.includeInNetWorth !== false).toArray(),
      db.goals.filter(g => !g.isAchieved).toArray(),
      db.recurringRules.filter(r => r.isActive).toArray(),
      db.settings.get('singleton'),
    ]);

    const totalAccounts = accounts.reduce((s, a) => s + a.balance, 0);
    const totalAssets = assets.reduce((s, a) => s + a.currentValue, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.outstandingBalance, 0);
    const netWorth = totalAccounts + totalAssets - totalLiabilities;

    const now = new Date();
    const monthStart = startOfMonth(now).toISOString().slice(0, 10);
    const monthEnd = endOfMonth(now).toISOString().slice(0, 10);
    const monthTx = await db.transactions.where('date').between(monthStart, monthEnd).toArray();
    const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const surplus = income - expenses;
    const savingsRate = income > 0 ? surplus / income : 0;

    const prevStart = startOfMonth(subMonths(now, 1)).toISOString().slice(0, 10);
    const prevEnd = endOfMonth(subMonths(now, 1)).toISOString().slice(0, 10);
    const prevTx = await db.transactions.where('date').between(prevStart, prevEnd).toArray();
    const prevExpenses = prevTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const liquid = accounts.filter(a => ['current', 'savings', 'isa_cash', 'cash'].includes(a.type)).reduce((s, a) => s + a.balance, 0);
    const monthlyExpenses = prevExpenses || expenses || (settings?.primaryIncome ?? 35000) * 0.7;
    const runwayMonths = monthlyExpenses > 0 ? Math.floor(liquid / monthlyExpenses) : 999;

    const allSnapshots = await db.monthlySnapshots.orderBy('yearMonth').toArray();
    const nwHistory = allSnapshots.slice(-13).map(s => ({ date: s.yearMonth, netWorth: s.netWorth }));

    const sortedGoals = [...goals].sort((a, b) => {
      const p: Record<string, number> = { essential: 0, important: 1, nice_to_have: 2 };
      return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
    });
    const topGoal = sortedGoals[0] ?? null;

    const sevenDays = addDays(now, 7).toISOString().slice(0, 10);
    const upcoming = recurringRules.filter(r => r.startDate <= sevenDays).slice(0, 5);

    const recData = { accounts, transactions: monthTx, goals, liabilities, recurringRules, settings: settings!, monthlyExpenses };
    const recs = settings ? generateRecommendations(recData) : [];

    return { netWorth, income, expenses, surplus, savingsRate, runwayMonths, liquid, nwHistory, topGoal, upcoming, rec: recs[0] ?? null };
  }, []);

  if (!data) return (
    <PageLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </PageLayout>
  );

  const { netWorth, income, expenses, surplus, savingsRate, runwayMonths, nwHistory, topGoal, upcoming, rec } = data;
  const runwayColor = runwayMonths > 12 ? 'text-positive' : runwayMonths > 3 ? 'text-warning' : 'text-negative';

  return (
    <PageLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Net Worth Hero */}
        <Card className="md:col-span-2 xl:col-span-3">
          <CardHeader>
            <CardTitle>Net Worth</CardTitle>
            <Badge variant={netWorth >= 0 ? 'positive' : 'negative'}>{netWorth >= 0 ? 'Positive' : 'Negative'}</Badge>
          </CardHeader>
          <p className="font-mono text-3xl font-bold text-text-primary tabular-nums mb-4">{formatCurrency(netWorth, currency, locale, true)}</p>
          {nwHistory.length > 1
            ? <NetWorthChart data={nwHistory} height={120} sparkline />
            : <div className="h-20 flex items-center justify-center text-sm text-text-tertiary">Add transactions to see history</div>}
        </Card>

        {/* Cash Flow */}
        <Card>
          <CardHeader><CardTitle>Cash Flow</CardTitle><span className="text-xs text-text-tertiary">This month</span></CardHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Income</span><span className="font-mono text-positive">{formatCurrency(income, currency, locale, true)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Expenses</span><span className="font-mono text-negative">{formatCurrency(expenses, currency, locale, true)}</span></div>
            <div className="h-px bg-border" />
            <div className="flex justify-between text-sm font-semibold"><span className="text-text-primary">Surplus</span><span className={`font-mono ${surplus >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(surplus, currency, locale, true)}</span></div>
          </div>
        </Card>

        {/* Runway */}
        <Card>
          <CardHeader><CardTitle>Runway</CardTitle></CardHeader>
          <p className={`font-mono text-3xl font-bold tabular-nums ${runwayColor}`}>{runwayMonths > 120 ? '10+ yr' : formatMonths(runwayMonths)}</p>
          <p className="text-xs text-text-tertiary mt-1">at current spend rate</p>
        </Card>

        {/* Savings Rate */}
        <Card>
          <CardHeader><CardTitle>Savings Rate</CardTitle><span className="text-xs text-text-tertiary">This month</span></CardHeader>
          <p className="font-mono text-3xl font-bold text-text-primary tabular-nums">{(savingsRate * 100).toFixed(0)}%</p>
          <p className="text-xs text-text-tertiary mt-1">{savingsRate >= 0.2 ? '✓ On track' : 'Aim for 20%+'}</p>
        </Card>

        {/* Top Goal */}
        {topGoal && (
          <Card>
            <CardHeader>
              <CardTitle>Top Goal</CardTitle>
              <Link to="/future/goals" className="text-xs text-accent hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
            </CardHeader>
            <div className="flex items-center gap-4">
              <GoalGauge progress={topGoal.currentAmount / topGoal.targetAmount} size={64} color={topGoal.color || 'var(--color-accent)'} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{topGoal.name}</p>
                <p className="text-xs text-text-tertiary">{formatCurrency(topGoal.currentAmount, currency, locale, true)} of {formatCurrency(topGoal.targetAmount, currency, locale, true)}</p>
                <div className="mt-2 h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, topGoal.currentAmount / topGoal.targetAmount * 100)}%` }} />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Top Insight */}
        {rec && (
          <Card>
            <CardHeader><CardTitle>Top Insight</CardTitle><Link to="/insights" className="text-xs text-accent hover:underline">View all →</Link></CardHeader>
            <p className="text-sm font-semibold text-text-primary mb-1">{rec.title}</p>
            <p className="text-xs text-text-secondary line-clamp-3">{rec.body}</p>
            {rec.estimatedAnnualValue && <p className="mt-2 text-xs font-mono font-semibold text-accent">+{formatCurrency(rec.estimatedAnnualValue, currency, locale, true)}/yr</p>}
          </Card>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Upcoming Rules</CardTitle></CardHeader>
            <div className="space-y-2">
              {upcoming.map(r => (
                <div key={r.id} className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary truncate">{r.name}</span>
                  <span className={`font-mono flex-shrink-0 ml-2 ${r.type === 'income' ? 'text-positive' : 'text-negative'}`}>{formatCurrency(r.amount, currency, locale, true)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
