import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Skeleton, EmptyState, Button } from '../../components/ui';
import { FanChart } from '../../components/charts/FanChart';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatPercentPlain } from '../../lib/format';
import { runProjection } from '../../lib/projections';
import type { ProjectionInput } from '../../lib/projections';
import { useAppStore } from '../../stores/useAppStore';
import { generateId } from '../../lib/utils';

export default function Projection() {
  const { currency, locale } = useAppStore();

  const ctx = useLiveQuery(async () => {
    const [settings, accounts, liabilities, investments, assets, goals, lifeEvents, scenarios, people] = await Promise.all([
      db.settings.get('singleton'),
      db.accounts.filter(a => a.isActive).toArray(),
      db.liabilities.toArray(),
      db.investments.toArray(),
      db.assets.filter(a => a.includeInNetWorth).toArray(),
      db.goals.toArray(),
      db.lifeEvents.filter(e => e.isActive).toArray(),
      db.scenarios.filter(s => s.isBaseline).first(),
      db.people.toArray(),
    ]);
    return { settings, accounts, liabilities, investments, assets, goals, lifeEvents, scenario: scenarios, people };
  }, []);

  const result = ctx && ctx.settings && ctx.scenario
    ? runProjection({
        settings: ctx.settings,
        accounts: ctx.accounts,
        liabilities: ctx.liabilities,
        investments: ctx.investments,
        assets: ctx.assets,
        goals: ctx.goals,
        lifeEvents: ctx.lifeEvents,
        scenario: ctx.scenario,
        people: ctx.people,
      } as ProjectionInput)
    : null;

  if (!ctx) {
    return <PageLayout><Skeleton className="h-80" /></PageLayout>;
  }

  if (!ctx.settings) {
    return (
      <PageLayout>
        <EmptyState
          title="Please complete your settings first"
          description="Projections need your retirement age, life expectancy, and investment assumptions before they can run."
          action={<Link to="/library"><Button>Go to Settings</Button></Link>}
        />
      </PageLayout>
    );
  }

  if (!ctx.scenario) {
    const createBaseline = async () => {
      const ts = new Date().toISOString();
      await db.scenarios.add({
        id: generateId(),
        name: 'Baseline',
        description: 'Current plan — no changes',
        isBaseline: true,
        color: '#3b82f6',
        overrides: {},
        createdAt: ts,
        updatedAt: ts,
      });
    };
    return (
      <PageLayout>
        <EmptyState
          title="No baseline scenario found"
          description="A baseline scenario is required to run projections. Create one to continue."
          action={<Button onClick={createBaseline}>Create baseline</Button>}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Median NW at Retirement</p>
          <p className="font-mono text-lg font-bold text-text-primary">{result ? formatCurrency(result.retirementNetWorthMedian, currency, locale, true) : '—'}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-tertiary mb-1">P10 (Pessimistic)</p>
          <p className="font-mono text-lg font-bold text-text-secondary">{result ? formatCurrency(result.retirementNetWorthP10, currency, locale, true) : '—'}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-tertiary mb-1">P90 (Optimistic)</p>
          <p className="font-mono text-lg font-bold text-positive">{result ? formatCurrency(result.retirementNetWorthP90, currency, locale, true) : '—'}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Probability of Ruin</p>
          <p className={`font-mono text-lg font-bold ${result && result.probabilityOfRuin < 0.1 ? 'text-positive' : 'text-negative'}`}>
            {result ? formatPercentPlain(result.probabilityOfRuin) : '—'}
          </p>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Monte Carlo Projection (1000 simulations)</CardTitle></CardHeader>
        {!result ? <Skeleton className="h-80" /> : <FanChart data={result.bands} height={360} />}
      </Card>

      {result && result.inflectionPoints.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Key Milestones</CardTitle></CardHeader>
          <div className="divide-y divide-border">
            {result.inflectionPoints.map((pt, i) => (
              <div key={i} className="flex justify-between py-3 text-sm">
                <span className="text-text-secondary">{pt.description}</span>
                <span className="font-mono text-text-tertiary">{pt.date}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageLayout>
  );
}
