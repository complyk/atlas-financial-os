import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Recommendation } from '../../db/schema';
import { Skeleton, EmptyState, Tabs } from '../../components/ui';
import { InsightCard } from '../../components/shared/InsightCard';
import { PageLayout } from '../../components/layout/PageLayout';
import { RECOMMENDATION_RULES, type RecommendationOutput } from '../../lib/recommendations';
import { startOfMonth, endOfMonth, addDays } from 'date-fns';

type Status = 'active' | 'snoozed' | 'dismissed';

interface DisplayRec extends RecommendationOutput {
  id: string;
  ruleId: string;
  status: Status;
  snoozeUntil?: string;
}

function readStatus(stored: Recommendation | undefined): { status: Status; snoozeUntil?: string } {
  if (!stored) return { status: 'active' };
  // Extra runtime fields (status, snoozeUntil) are stored alongside the schema fields.
  const extra = stored as Recommendation & { status?: Status; snoozeUntil?: string };
  if (extra.status === 'snoozed') {
    if (extra.snoozeUntil && extra.snoozeUntil < new Date().toISOString()) {
      return { status: 'active' };
    }
    return { status: 'snoozed', snoozeUntil: extra.snoozeUntil };
  }
  if (extra.status === 'dismissed' || stored.isDismissed) return { status: 'dismissed' };
  return { status: 'active' };
}

export default function Recommendations() {
  const [tab, setTab] = useState<Status>('active');

  const data = useLiveQuery(async () => {
    const now = new Date();
    const monthStart = startOfMonth(now).toISOString().slice(0, 10);
    const monthEnd = endOfMonth(now).toISOString().slice(0, 10);
    const [accounts, transactions, goals, liabilities, recurringRules, settings, stored] = await Promise.all([
      db.accounts.filter(a => a.isActive).toArray(),
      db.transactions.where('date').between(monthStart, monthEnd).toArray(),
      db.goals.toArray(),
      db.liabilities.toArray(),
      db.recurringRules.filter(r => r.isActive).toArray(),
      db.settings.get('singleton'),
      db.recommendations.toArray(),
    ]);
    if (!settings) return [] as DisplayRec[];

    const monthlyExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const storedById = new Map<string, Recommendation>(stored.map(r => [r.id, r]));

    const out: DisplayRec[] = [];
    for (const rule of RECOMMENDATION_RULES) {
      const result = rule.evaluate({
        accounts,
        transactions,
        goals,
        liabilities,
        recurringRules,
        settings,
        monthlyExpenses,
      });
      if (!result) continue;
      const id = `rec-${rule.id}`;
      const { status, snoozeUntil } = readStatus(storedById.get(id));
      out.push({ ...result, id, ruleId: rule.id, status, snoozeUntil });
    }

    // Also surface dismissed/snoozed rules that no longer evaluate (so users
    // can see history) — only if they exist in DB and have status set.
    const surfacedIds = new Set(out.map(r => r.id));
    for (const s of stored) {
      if (surfacedIds.has(s.id)) continue;
      const extra = s as Recommendation & { status?: Status; snoozeUntil?: string };
      if (extra.status === 'dismissed' || s.isDismissed) {
        out.push({
          id: s.id,
          ruleId: s.ruleId,
          title: s.title,
          body: s.body,
          priority: s.priority,
          estimatedAnnualValue: s.estimatedAnnualValue,
          status: 'dismissed',
        });
      } else if (extra.status === 'snoozed' && extra.snoozeUntil && extra.snoozeUntil >= new Date().toISOString()) {
        out.push({
          id: s.id,
          ruleId: s.ruleId,
          title: s.title,
          body: s.body,
          priority: s.priority,
          estimatedAnnualValue: s.estimatedAnnualValue,
          status: 'snoozed',
          snoozeUntil: extra.snoozeUntil,
        });
      }
    }

    return out;
  }, []);

  const handleDismiss = async (rec: DisplayRec) => {
    const ts = new Date().toISOString();
    await db.recommendations.put({
      id: rec.id,
      ruleId: rec.ruleId,
      title: rec.title,
      body: rec.body,
      priority: rec.priority,
      estimatedAnnualValue: rec.estimatedAnnualValue,
      isDismissed: true,
      generatedAt: ts,
      dismissedAt: ts,
      // Extra runtime fields persisted alongside schema fields.
      ...({ status: 'dismissed' } as object),
    } as Recommendation);
  };

  const handleSnooze = async (rec: DisplayRec) => {
    const ts = new Date().toISOString();
    const snoozeUntil = addDays(new Date(), 30).toISOString();
    await db.recommendations.put({
      id: rec.id,
      ruleId: rec.ruleId,
      title: rec.title,
      body: rec.body,
      priority: rec.priority,
      estimatedAnnualValue: rec.estimatedAnnualValue,
      isDismissed: false,
      generatedAt: ts,
      ...({ status: 'snoozed', snoozeUntil } as object),
    } as Recommendation);
  };

  const handleRestore = async (rec: DisplayRec) => {
    // Restore by removing the persisted dismissal/snooze.
    await db.recommendations.delete(rec.id);
  };

  const counts = {
    active: data?.filter(r => r.status === 'active').length ?? 0,
    snoozed: data?.filter(r => r.status === 'snoozed').length ?? 0,
    dismissed: data?.filter(r => r.status === 'dismissed').length ?? 0,
  };

  const filtered = data?.filter(r => r.status === tab) ?? [];

  return (
    <PageLayout>
      <div className="mb-4">
        <Tabs
          tabs={[
            { id: 'active', label: 'Active', count: counts.active },
            { id: 'snoozed', label: 'Snoozed', count: counts.snoozed },
            { id: 'dismissed', label: 'Dismissed', count: counts.dismissed },
          ]}
          activeTab={tab}
          onChange={(id) => setTab(id as Status)}
        />
      </div>

      {!data ? (
        <div className="space-y-3">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-28 rounded-2xl"/>)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tab === 'active' ? 'No recommendations' : tab === 'snoozed' ? 'Nothing snoozed' : 'Nothing dismissed'}
          description={tab === 'active' ? 'Your finances look great! Check back later.' : 'Items you snooze or dismiss will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-tertiary">{filtered.length} {tab} recommendation{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.map(r => (
            <InsightCard
              key={r.id}
              recommendation={r}
              onDismiss={r.status === 'active' ? () => handleDismiss(r) : undefined}
              onSnooze={r.status === 'active' ? () => handleSnooze(r) : undefined}
              onRestore={r.status !== 'active' ? () => handleRestore(r) : undefined}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
