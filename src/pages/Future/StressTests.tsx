import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Button, Skeleton } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';
import { BUILT_IN_STRESS_TESTS, runStressTest } from '../../lib/stressTests';
import type { StressTestResult } from '../../lib/stressTests';
import type { ProjectionInput } from '../../lib/projections';

export default function StressTests() {
  const [results, setResults] = useState<Record<string, StressTestResult>>({});
  const [running, setRunning] = useState<string | null>(null);

  const baseInput = useLiveQuery(async () => {
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
    if (!settings || !scenarios) return null;
    return { settings, accounts, liabilities, investments, assets, goals, lifeEvents, scenario: scenarios, people } as ProjectionInput;
  }, []);

  const runTest = async (testId: string) => {
    if (!baseInput) return;
    setRunning(testId);
    setTimeout(() => {
      const test = BUILT_IN_STRESS_TESTS.find(t => t.id === testId);
      if (!test) { setRunning(null); return; }
      try {
        const result = runStressTest(baseInput, test);
        setResults(prev => ({ ...prev, [testId]: result }));
      } catch (e) {
        console.error(e);
      }
      setRunning(null);
    }, 100);
  };

  const runAll = async () => {
    if (!baseInput) return;
    for (const test of BUILT_IN_STRESS_TESTS) {
      setRunning(test.id);
      await new Promise<void>(resolve => setTimeout(() => {
        try {
          const result = runStressTest(baseInput, test);
          setResults(prev => ({ ...prev, [test.id]: result }));
        } catch (e) { console.error(e); }
        resolve();
      }, 50));
    }
    setRunning(null);
  };

  return (
    <PageLayout actions={<Button onClick={runAll} size="sm" disabled={!baseInput}><Zap size={14} className="mr-1" />Run All</Button>}>
      {!baseInput ? <Skeleton className="h-64" /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BUILT_IN_STRESS_TESTS.map(test => {
            const result = results[test.id];
            const isRunning = running === test.id;
            return (
              <Card key={test.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{test.label}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{test.description}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => runTest(test.id)} disabled={isRunning}>
                    <Zap size={13} className={isRunning ? 'animate-pulse' : ''} />
                  </Button>
                </div>
                {result && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-surface-raised rounded-lg p-2">
                        <p className="text-xs text-text-tertiary">NW Year 5</p>
                        <p className="font-mono text-sm font-bold text-text-primary">{formatCurrency(result.netWorthAtYear5, 'AED', 'en-AE', true)}</p>
                        <p className={`text-xs font-mono ${result.deltaYear5 >= 0 ? 'text-positive' : 'text-negative'}`}>{result.deltaYear5 >= 0 ? '+' : ''}{formatCurrency(result.deltaYear5, 'AED', 'en-AE', true)}</p>
                      </div>
                      <div className="bg-surface-raised rounded-lg p-2">
                        <p className="text-xs text-text-tertiary">NW Year 10</p>
                        <p className="font-mono text-sm font-bold text-text-primary">{formatCurrency(result.netWorthAtYear10, 'AED', 'en-AE', true)}</p>
                        <p className={`text-xs font-mono ${result.deltaYear10 >= 0 ? 'text-positive' : 'text-negative'}`}>{result.deltaYear10 >= 0 ? '+' : ''}{formatCurrency(result.deltaYear10, 'AED', 'en-AE', true)}</p>
                      </div>
                    </div>
                    {result.minimumFix && <p className="text-xs text-text-tertiary">{result.minimumFix}</p>}
                  </div>
                )}
                {!result && !isRunning && (
                  <p className="text-xs text-text-tertiary">Click ⚡ to run this test</p>
                )}
                {isRunning && <p className="text-xs text-accent animate-pulse">Running...</p>}
              </Card>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
