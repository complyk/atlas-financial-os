import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Skeleton } from '../../components/ui';
import { CashFlowBar } from '../../components/charts/CashFlowBar';
import { PageLayout } from '../../components/layout/PageLayout';
import { InsightCard } from '../../components/shared/InsightCard';
import { formatCurrency, formatPercentPlain } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';
import { generateRecommendations } from '../../lib/recommendations';

type Tone = 'positive' | 'negative' | 'neutral';

interface NarrativeFact {
  text: string;
  tone: Tone;
}

export default function MonthlyReview() {
  const { currency, locale } = useAppStore();
  const [monthOffset, setMonthOffset] = useState(0);

  const data = useLiveQuery(async () => {
    const targetDate = subMonths(new Date(), monthOffset);
    const monthStart = startOfMonth(targetDate).toISOString().slice(0, 10);
    const monthEnd = endOfMonth(targetDate).toISOString().slice(0, 10);
    const monthLabel = format(targetDate, 'MMMM yyyy');
    const yearMonth = format(targetDate, 'yyyy-MM');

    const prevDate = subMonths(targetDate, 1);
    const prevStart = startOfMonth(prevDate).toISOString().slice(0, 10);
    const prevEnd = endOfMonth(prevDate).toISOString().slice(0, 10);
    const prevYearMonth = format(prevDate, 'yyyy-MM');

    const [txs, prevTxs, categories, snapshots, accounts, goals, liabilities, recurringRules, settings] = await Promise.all([
      db.transactions.where('date').between(monthStart, monthEnd).toArray(),
      db.transactions.where('date').between(prevStart, prevEnd).toArray(),
      db.categories.toArray(),
      db.monthlySnapshots.toArray(),
      db.accounts.filter(a => a.isActive).toArray(),
      db.goals.toArray(),
      db.liabilities.toArray(),
      db.recurringRules.filter(r => r.isActive).toArray(),
      db.settings.get('singleton'),
    ]);

    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const surplus = income - expenses;
    const savingsRate = income > 0 ? surplus / income : 0;

    const prevIncome = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const prevSavingsRate = prevIncome > 0 ? (prevIncome - prevExpenses) / prevIncome : 0;

    // Per-category spend (this and previous month)
    const spendBy = (list: typeof txs) => {
      const map: Record<string, number> = {};
      list.filter(t => t.type === 'expense' && t.categoryId).forEach(t => {
        map[t.categoryId!] = (map[t.categoryId!] || 0) + t.amount;
      });
      return map;
    };
    const catSpend = spendBy(txs);
    const prevCatSpend = spendBy(prevTxs);

    const topCategories = Object.entries(catSpend)
      .map(([id, amount]) => ({ name: catMap[id]?.name || 'Uncategorised', amount, color: catMap[id]?.color }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // Biggest mover: largest absolute change (this − prev) per category.
    const allCatIds = new Set([...Object.keys(catSpend), ...Object.keys(prevCatSpend)]);
    let biggestMover: { name: string; delta: number } | null = null;
    for (const id of allCatIds) {
      const delta = (catSpend[id] || 0) - (prevCatSpend[id] || 0);
      if (!biggestMover || Math.abs(delta) > Math.abs(biggestMover.delta)) {
        biggestMover = { name: catMap[id]?.name || 'Uncategorised', delta };
      }
    }

    // Net worth change vs last month from monthly snapshots
    const thisSnap = snapshots.find(s => s.yearMonth === yearMonth);
    const prevSnap = snapshots.find(s => s.yearMonth === prevYearMonth);
    const netWorthChange = thisSnap && prevSnap ? thisSnap.netWorth - prevSnap.netWorth : null;
    const netWorth = thisSnap?.netWorth ?? null;

    // 6-month chart
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

    // Top recommendation for the month (current state, not historical).
    let topRec = null;
    if (settings) {
      const recs = generateRecommendations({
        accounts,
        transactions: txs,
        goals,
        liabilities,
        recurringRules,
        settings,
        monthlyExpenses: expenses,
      });
      topRec = recs[0] ?? null;
    }

    return {
      monthLabel, income, expenses, surplus, savingsRate,
      prevIncome, prevExpenses, prevSavingsRate,
      topCategories, chartData, biggestMover,
      netWorth, netWorthChange, topRec,
    };
  }, [monthOffset]);

  const months = Array.from({length: 12}, (_, i) => ({
    id: String(i),
    label: i === 0 ? 'This month' : format(subMonths(new Date(), i), 'MMM yy'),
  }));

  const buildNarrative = (d: NonNullable<typeof data>): NarrativeFact[] => {
    const facts: NarrativeFact[] = [];

    // Net worth
    if (d.netWorthChange !== null && d.netWorth !== null) {
      const grew = d.netWorthChange >= 0;
      facts.push({
        text: `Your net worth ${grew ? 'grew' : 'fell'} by ${formatCurrency(Math.abs(d.netWorthChange), currency, locale, true)} this month${grew ? '' : ''}.`,
        tone: grew ? 'positive' : 'negative',
      });
    }

    // Income vs last month
    if (d.prevIncome > 0 || d.income > 0) {
      const incomeDelta = d.income - d.prevIncome;
      if (Math.abs(incomeDelta) > 1) {
        const up = incomeDelta > 0;
        facts.push({
          text: `Income was ${formatCurrency(d.income, currency, locale, true)} — ${formatCurrency(Math.abs(incomeDelta), currency, locale, true)} ${up ? 'higher' : 'lower'} than last month.`,
          tone: up ? 'positive' : 'negative',
        });
      } else {
        facts.push({
          text: `Income was ${formatCurrency(d.income, currency, locale, true)}, in line with last month.`,
          tone: 'neutral',
        });
      }
    }

    // Expenses vs last month + biggest mover
    if (d.prevExpenses > 0 || d.expenses > 0) {
      const expDelta = d.expenses - d.prevExpenses;
      if (Math.abs(expDelta) > 1) {
        const up = expDelta > 0;
        const moverPart = d.biggestMover && Math.abs(d.biggestMover.delta) > 1
          ? ` — biggest mover was ${d.biggestMover.name} (${d.biggestMover.delta >= 0 ? '+' : '−'}${formatCurrency(Math.abs(d.biggestMover.delta), currency, locale, true)})`
          : '';
        facts.push({
          text: `You spent ${formatCurrency(Math.abs(expDelta), currency, locale, true)} ${up ? 'more' : 'less'} than last month${moverPart}.`,
          tone: up ? 'negative' : 'positive',
        });
      } else {
        facts.push({
          text: `Expenses came in at ${formatCurrency(d.expenses, currency, locale, true)}, similar to last month.`,
          tone: 'neutral',
        });
      }
    }

    // Savings rate vs last month
    if (d.income > 0) {
      const ratePts = (d.savingsRate - d.prevSavingsRate) * 100;
      if (Math.abs(ratePts) >= 0.5) {
        const up = ratePts > 0;
        facts.push({
          text: `Your savings rate was ${formatPercentPlain(d.savingsRate)}, ${up ? 'up' : 'down'} ${Math.abs(ratePts).toFixed(0)} point${Math.abs(ratePts) >= 1.5 ? 's' : ''} from last month.`,
          tone: up ? 'positive' : 'negative',
        });
      } else {
        facts.push({
          text: `Your savings rate was ${formatPercentPlain(d.savingsRate)}, flat versus last month.`,
          tone: 'neutral',
        });
      }
    }

    // Surplus framing
    if (d.surplus < 0) {
      facts.push({
        text: `You spent ${formatCurrency(Math.abs(d.surplus), currency, locale, true)} more than you earned this month.`,
        tone: 'negative',
      });
    } else if (d.surplus > 0 && d.income > 0) {
      facts.push({
        text: `Net surplus of ${formatCurrency(d.surplus, currency, locale, true)} added to your savings this month.`,
        tone: 'positive',
      });
    }

    return facts;
  };

  const toneClass: Record<Tone, string> = {
    positive: 'text-positive',
    negative: 'text-negative',
    neutral: 'text-text-secondary',
  };
  const dotClass: Record<Tone, string> = {
    positive: 'bg-positive',
    negative: 'bg-negative',
    neutral: 'bg-text-tertiary',
  };

  return (
    <PageLayout>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" role="tablist" aria-label="Month picker">
        {months.map(m => (
          <button
            key={m.id}
            role="tab"
            aria-selected={monthOffset === Number(m.id)}
            onClick={() => setMonthOffset(Number(m.id))}
            className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${monthOffset === Number(m.id) ? 'bg-accent text-white' : 'bg-surface-raised text-text-secondary hover:text-text-primary'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {!data ? <Skeleton className="h-64" /> : (
        <>
          <h2 className="text-lg font-semibold text-text-primary mb-4">{data.monthLabel}</h2>

          <Card className="mb-6">
            <CardHeader><CardTitle>Narrative</CardTitle></CardHeader>
            <ul className="space-y-2">
              {buildNarrative(data).map((fact, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotClass[fact.tone]}`} aria-hidden="true" />
                  <span className={toneClass[fact.tone]}>{fact.text}</span>
                </li>
              ))}
            </ul>
          </Card>

          {data.topRec && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-text-primary mb-2">This month's action</h3>
              <InsightCard recommendation={data.topRec} />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card><p className="text-xs text-text-tertiary mb-1">Income</p><p className="font-mono text-xl font-bold text-positive">{formatCurrency(data.income, currency, locale, true)}</p></Card>
            <Card><p className="text-xs text-text-tertiary mb-1">Expenses</p><p className="font-mono text-xl font-bold text-negative">{formatCurrency(data.expenses, currency, locale, true)}</p></Card>
            <Card><p className="text-xs text-text-tertiary mb-1">Surplus</p><p className={`font-mono text-xl font-bold ${data.surplus >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(data.surplus, currency, locale, true)}</p></Card>
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
                        <span className="font-mono font-semibold text-text-primary">{formatCurrency(cat.amount, currency, locale, true)}</span>
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
