import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/schema';
import { Card, Select, Badge, Skeleton, EmptyState } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatDate } from '../../lib/format';

const ACTION_VARIANTS: Record<string, 'positive' | 'negative' | 'warning'> = { create: 'positive', delete: 'negative', update: 'warning' };

export default function AuditLog() {
  const [tableFilter, setTableFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');

  const entries = useLiveQuery(() => db.auditLog.orderBy('timestamp').reverse().limit(500).toArray(), []);

  const tables = entries ? Array.from(new Set(entries.map(e => e.table))) : [];

  const filtered = entries?.filter(e => {
    if (tableFilter !== 'all' && e.table !== tableFilter) return false;
    if (actionFilter !== 'all' && e.action !== actionFilter) return false;
    return true;
  });

  return (
    <PageLayout>
      <div className="flex gap-2 mb-4">
        <Select options={[{value:'all',label:'All tables'}, ...tables.map(t => ({value:t, label:t}))]} value={tableFilter} onChange={e => setTableFilter(e.target.value)} />
        <Select options={[{value:'all',label:'All actions'},{value:'create',label:'Create'},{value:'update',label:'Update'},{value:'delete',label:'Delete'}]} value={actionFilter} onChange={e => setActionFilter(e.target.value)} />
      </div>

      {!entries ? <Skeleton className="h-64" />
        : (filtered ?? []).length === 0 ? <EmptyState title="No audit entries" description="Actions will be logged here as you use the app." />
        : (
          <Card padded={false}>
            <div className="divide-y divide-border max-h-[calc(100vh-200px)] overflow-y-auto">
              {(filtered ?? []).map(entry => {
                const snippet = (entry.diff
                  ?? (entry.after ? JSON.stringify(entry.after) : entry.before ? JSON.stringify(entry.before) : '')) as string;
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                    <Badge variant={ACTION_VARIANTS[entry.action] || 'default'} className="mt-0.5">{entry.action}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{entry.table}</p>
                      <p className="text-xs text-text-tertiary font-mono truncate">{entry.recordId}</p>
                      {snippet && <p className="text-xs text-text-tertiary font-mono truncate mt-1">{snippet.slice(0, 160)}</p>}
                    </div>
                    <span className="text-xs text-text-tertiary flex-shrink-0 font-mono">{formatDate(entry.timestamp, 'dd MMM HH:mm')}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
    </PageLayout>
  );
}
