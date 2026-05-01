import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sparkles, Wallet } from 'lucide-react';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { motion } from 'framer-motion';
import { db, type Category } from '../../db/schema';
import {
  Card,
  CardTitle,
  Button,
  Badge,
  Tabs,
  EmptyState,
  Skeleton,
  ConfirmDialog,
  EditableCurrency,
} from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';

type Period = 'this' | 'last' | 'avg3';

interface BudgetRow {
  category: Category;
  spent: number;
  budget: number;
  pct: number;
}

function periodRange(period: Period): { start: string; end: string; divisor: number } {
  const now = new Date();
  if (period === 'this') {
    return {
      start: startOfMonth(now).toISOString().slice(0, 10),
      end: endOfMonth(now).toISOString().slice(0, 10),
      divisor: 1,
    };
  }
  if (period === 'last') {
    const lm = subMonths(now, 1);
    return {
      start: startOfMonth(lm).toISOString().slice(0, 10),
      end: endOfMonth(lm).toISOString().slice(0, 10),
      divisor: 1,
    };
  }
  // 3-month avg: last 3 full months
  return {
    start: startOfMonth(subMonths(now, 3)).toISOString().slice(0, 10),
    end: endOfMonth(subMonths(now, 1)).toISOString().slice(0, 10),
    divisor: 3,
  };
}

export default function Budgets() {
  const [period, setPeriod] = useState<Period>('this');
  const [showSuggest, setShowSuggest] = useState(false);
  const { currency, locale } = useAppStore();

  const data = useLiveQuery(async () => {
    const [categories, allTx] = await Promise.all([
      db.categories.filter((c) => c.type === 'expense').toArray(),
      db.transactions.filter((t) => t.type === 'expense').toArray(),
    ]);

    const { start, end, divisor } = periodRange(period);
    const periodTx = allTx.filter((t) => t.date >= start && t.date <= end);

    const spentByCategory: Record<string, number> = {};
    for (const tx of periodTx) {
      if (!tx.categoryId) continue;
      spentByCategory[tx.categoryId] =
        (spentByCategory[tx.categoryId] || 0) + Math.abs(tx.amount);
    }

    const rows: BudgetRow[] = categories.map((c) => {
      const spent = (spentByCategory[c.id] || 0) / divisor;
      const budget = c.budgetMonthly ?? 0;
      const pct = budget > 0 ? spent / budget : 0;
      return { category: c, spent, budget, pct };
    });

    // Untracked: transactions with no categoryId or category not in expense set
    const knownCatIds = new Set(categories.map((c) => c.id));
    const untrackedTotal =
      periodTx
        .filter((t) => !t.categoryId || !knownCatIds.has(t.categoryId))
        .reduce((s, t) => s + Math.abs(t.amount), 0) / divisor;

    return { rows, untrackedTotal };
  }, [period]);

  const handleSuggestBudgets = async () => {
    const allTx = await db.transactions
      .filter((t) => t.type === 'expense')
      .toArray();
    const now = new Date();
    const start = startOfMonth(subMonths(now, 3)).toISOString().slice(0, 10);
    const end = endOfMonth(subMonths(now, 1)).toISOString().slice(0, 10);
    const recent = allTx.filter((t) => t.date >= start && t.date <= end);
    const byCategory: Record<string, number> = {};
    for (const tx of recent) {
      if (!tx.categoryId) continue;
      byCategory[tx.categoryId] =
        (byCategory[tx.categoryId] || 0) + Math.abs(tx.amount);
    }
    const ts = new Date().toISOString();
    await Promise.all(
      Object.entries(byCategory).map(async ([catId, total]) => {
        const avg = total / 3;
        const rounded = Math.ceil(avg / 50) * 50;
        if (rounded > 0) {
          await db.categories.update(catId, {
            budgetMonthly: rounded,
            updatedAt: ts,
          } as Partial<Category>);
        }
      }),
    );
    setShowSuggest(false);
  };

  if (!data) {
    return (
      <PageLayout>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </PageLayout>
    );
  }

  const totalBudgeted = data.rows.reduce((s, r) => s + r.budget, 0);
  const totalSpent = data.rows.reduce((s, r) => s + r.spent, 0);
  const net = totalBudgeted - totalSpent;
  const overallPct = totalBudgeted > 0 ? totalSpent / totalBudgeted : 0;
  const hasAnyBudget = data.rows.some((r) => r.budget > 0);

  const sorted = [...data.rows].sort((a, b) => b.spent - a.spent);
  const budgeted = sorted.filter((r) => r.budget > 0);
  const unbudgeted = sorted.filter((r) => r.budget === 0 && r.spent > 0);

  return (
    <PageLayout
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSuggest(true)}
          >
            <Sparkles size={14} /> Suggest budgets
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Period tabs */}
        <Tabs
          tabs={[
            { id: 'this', label: 'This month' },
            { id: 'last', label: 'Last month' },
            { id: 'avg3', label: '3-month avg' },
          ]}
          activeTab={period}
          onChange={(p) => setPeriod(p as Period)}
        />

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardTitle>Budgeted</CardTitle>
            <p className="font-mono text-2xl font-bold text-text-primary mt-1 tabular-nums">
              {formatCurrency(totalBudgeted, currency, locale, true)}
            </p>
          </Card>
          <Card>
            <CardTitle>Spent</CardTitle>
            <p
              className={`font-mono text-2xl font-bold mt-1 tabular-nums ${
                totalSpent > totalBudgeted && totalBudgeted > 0
                  ? 'text-negative'
                  : 'text-text-primary'
              }`}
            >
              {formatCurrency(totalSpent, currency, locale, true)}
            </p>
          </Card>
          <Card>
            <CardTitle>Net</CardTitle>
            <p
              className={`font-mono text-2xl font-bold mt-1 tabular-nums ${
                net >= 0 ? 'text-positive' : 'text-negative'
              }`}
            >
              {net >= 0
                ? `${formatCurrency(net, currency, locale, true)} under`
                : `${formatCurrency(-net, currency, locale, true)} over`}
            </p>
          </Card>
        </div>

        {/* Overall stacked bar */}
        {hasAnyBudget && (
          <Card>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>Overall progress</CardTitle>
              <span className="text-xs text-text-tertiary tabular-nums font-mono">
                {Math.round(overallPct * 100)}%
              </span>
            </div>
            <div className="h-3 bg-surface-raised rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, overallPct * 100)}%` }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className={`h-full rounded-full ${
                  overallPct >= 1
                    ? 'bg-negative'
                    : overallPct >= 0.8
                    ? 'bg-amber-500'
                    : 'bg-positive'
                }`}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-text-tertiary">
              <span>
                {formatCurrency(totalSpent, currency, locale, true)} spent
              </span>
              <span>
                of {formatCurrency(totalBudgeted, currency, locale, true)}
              </span>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!hasAnyBudget && unbudgeted.length === 0 && (
          <EmptyState
            icon={<Wallet size={32} />}
            title="No budgets set"
            description="Atlas can suggest budgets based on your last 3 months of spending."
            action={
              <Button onClick={() => setShowSuggest(true)}>
                <Sparkles size={14} /> Suggest budgets from history
              </Button>
            }
          />
        )}

        {/* Budgeted categories */}
        {budgeted.length > 0 && (
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <CardTitle>Budgeted</CardTitle>
            </div>
            <div className="divide-y divide-border">
              {budgeted.map((r, i) => (
                <motion.div
                  key={r.category.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="px-5 py-4 flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{
                      background: (r.category.color || '#6b7280') + '20',
                      color: r.category.color || '#6b7280',
                    }}
                    aria-hidden="true"
                  >
                    {r.category.icon ? (
                      <span className="text-xs font-semibold">
                        {r.category.icon.slice(0, 2)}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold">
                        {r.category.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5 gap-2 flex-wrap">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {r.category.name}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`font-mono text-sm tabular-nums ${
                            r.spent > r.budget
                              ? 'text-negative'
                              : 'text-text-secondary'
                          }`}
                        >
                          {formatCurrency(r.spent, currency, locale, true)}
                        </span>
                        <span className="text-text-tertiary text-sm">/</span>
                        <EditableCurrency
                          value={r.budget}
                          size="sm"
                          align="left"
                          onSave={async (v) => {
                            await db.categories.update(r.category.id, {
                              budgetMonthly: v,
                              updatedAt: new Date().toISOString(),
                            } as Partial<Category>);
                          }}
                          ariaLabel={`Edit budget for ${r.category.name}`}
                        />
                        {r.pct >= 1 ? (
                          <Badge variant="negative">Over</Badge>
                        ) : r.pct >= 0.8 ? (
                          <Badge variant="warning">Watch</Badge>
                        ) : (
                          <Badge variant="positive">Under</Badge>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, r.pct * 100)}%` }}
                        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                        className={`h-full rounded-full ${
                          r.pct >= 1
                            ? 'bg-negative'
                            : r.pct >= 0.8
                            ? 'bg-amber-500'
                            : 'bg-positive'
                        }`}
                      />
                    </div>
                    <p className="text-xs text-text-tertiary mt-1 tabular-nums">
                      {r.pct >= 1
                        ? `${formatCurrency(
                            r.spent - r.budget,
                            currency,
                            locale,
                            true,
                          )} over budget`
                        : `${formatCurrency(
                            r.budget - r.spent,
                            currency,
                            locale,
                            true,
                          )} left`}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Unbudgeted categories with spend */}
        {unbudgeted.length > 0 && (
          <Card padded={false}>
            <div className="px-5 pt-5 pb-3 border-b border-border flex items-center gap-2">
              <CardTitle>Untracked spending</CardTitle>
              <Badge variant="warning">No budget set</Badge>
            </div>
            <div className="divide-y divide-border">
              {unbudgeted.map((r, i) => (
                <motion.div
                  key={r.category.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className="px-5 py-4 flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{
                      background: (r.category.color || '#6b7280') + '20',
                      color: r.category.color || '#6b7280',
                    }}
                    aria-hidden="true"
                  >
                    <span className="text-xs font-semibold">
                      {r.category.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-medium text-text-primary">
                      {r.category.name}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm text-text-secondary tabular-nums">
                        {formatCurrency(r.spent, currency, locale, true)} spent
                      </span>
                      <EditableCurrency
                        value={0}
                        size="sm"
                        align="left"
                        onSave={async (v) => {
                          if (v <= 0) return;
                          await db.categories.update(r.category.id, {
                            budgetMonthly: v,
                            updatedAt: new Date().toISOString(),
                          } as Partial<Category>);
                        }}
                        ariaLabel={`Set budget for ${r.category.name}`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </Card>
        )}

        {/* Uncategorised spend */}
        {data.untrackedTotal > 0 && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Uncategorised transactions</CardTitle>
                <p className="text-xs text-text-tertiary mt-1">
                  Spending without a category assigned
                </p>
              </div>
              <span className="font-mono text-sm text-text-secondary tabular-nums">
                {formatCurrency(data.untrackedTotal, currency, locale, true)}
              </span>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={showSuggest}
        onClose={() => setShowSuggest(false)}
        onConfirm={handleSuggestBudgets}
        title="Suggest budgets from history?"
        message="Atlas will set a monthly budget for each expense category equal to your average spend over the last 3 months, rounded up to the nearest 50. You can edit any budget afterwards."
        confirmLabel="Apply suggestions"
      />
    </PageLayout>
  );
}
