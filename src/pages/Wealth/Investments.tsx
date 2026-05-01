import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { db, type Investment } from '../../db/schema';
import { cn } from '../../lib/utils';
import { Card, CardHeader, CardTitle, Button, EmptyState, Skeleton, ConfirmDialog, EditableCurrency } from '../../components/ui';
import { AllocationPie } from '../../components/charts/AllocationPie';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatPercent } from '../../lib/format';

function EditableUnits({ value, onSave }: { value: number; onSave: (v: number) => Promise<void> | void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  const commit = async () => {
    const num = Number(draft);
    if (isNaN(num)) { setEditing(false); setDraft(String(value)); return; }
    setSaving(true);
    try { await onSave(num); setEditing(false); }
    finally { setSaving(false); }
  };
  const cancel = () => { setEditing(false); setDraft(String(value)); };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input ref={ref} type="number" step="0.0001" value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
          disabled={saving}
          className="font-mono tabular-nums bg-transparent border-b border-accent focus:outline-none w-20 text-xs" />
        <button onClick={commit} disabled={saving} aria-label="Save units" className="text-positive p-0.5 rounded hover:bg-surface-raised"><Check size={11} /></button>
        <button onClick={cancel} disabled={saving} aria-label="Cancel" className="text-text-tertiary p-0.5 rounded hover:bg-surface-raised"><X size={11} /></button>
      </span>
    );
  }
  return (
    <button onClick={() => { setDraft(String(value)); setEditing(true); }}
      aria-label="Edit units"
      className={cn('group inline-flex items-center gap-1 hover:bg-surface-raised rounded px-1 -mx-1 transition-colors')}
    >
      <span>{value} units</span>
      <Pencil size={9} className="opacity-0 group-hover:opacity-50 transition-opacity" />
    </button>
  );
}

const ASSET_CLASS_COLORS: Record<string, string> = {
  global_equity: '#3b82f6', us_equity: '#10b981', uk_equity: '#f59e0b',
  eu_equity: '#8b5cf6', emerging_equity: '#06b6d4', bonds_global: '#6b7280',
  bonds_uk: '#9ca3af', bonds_corp: '#d1d5db', property_reit: '#f97316',
  commodities: '#eab308', cash_equiv: '#22c55e', crypto: '#ec4899',
  alternatives: '#a855f7', other: '#6b7280',
};

export default function Investments() {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const [investments, accounts] = await Promise.all([db.investments.toArray(), db.accounts.toArray()]);
    const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));
    return { investments, accMap };
  }, []);

  const totalValue = data?.investments.reduce((s, i) => s + i.units * i.currentPricePerUnit, 0) ?? 0;
  const totalCost = data?.investments.reduce((s, i) => s + i.units * i.costBasisPerUnit, 0) ?? 0;
  const totalGain = totalValue - totalCost;

  const pieData = data ? Object.entries(
    data.investments.reduce((acc, inv) => {
      const val = inv.units * inv.currentPricePerUnit;
      acc[inv.assetClass] = (acc[inv.assetClass] || 0) + val;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value, color: ASSET_CLASS_COLORS[name] })) : [];

  return (
    <PageLayout actions={<Button size="sm" disabled><Plus size={14} className="mr-1" />Add Holding</Button>}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Total Value</p><p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(totalValue, 'AED', 'en-AE', true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Total Cost</p><p className="font-mono text-xl font-bold text-text-secondary">{formatCurrency(totalCost, 'AED', 'en-AE', true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Unrealised P&amp;L</p><p className={`font-mono text-xl font-bold ${totalGain >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(totalGain, 'AED', 'en-AE', true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Return</p><p className={`font-mono text-xl font-bold ${totalGain >= 0 ? 'text-positive' : 'text-negative'}`}>{totalCost > 0 ? formatPercent(totalGain / totalCost) : '—'}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
            {!data ? <Skeleton className="h-48" /> : data.investments.length === 0 ? (
              <EmptyState title="No holdings" description="Add your investment positions." />
            ) : (
              <div className="divide-y divide-border">
                {data.investments.map(inv => {
                  const value = inv.units * inv.currentPricePerUnit;
                  const cost = inv.units * inv.costBasisPerUnit;
                  const gain = value - cost;
                  const weight = totalValue > 0 ? value / totalValue : 0;
                  return (
                    <div key={inv.id} className="flex items-center gap-3 py-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: (ASSET_CLASS_COLORS[inv.assetClass] || '#6b7280') + '20', color: ASSET_CLASS_COLORS[inv.assetClass] || '#6b7280' }}>
                        {inv.ticker?.slice(0, 2) || inv.name.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{inv.ticker ? `${inv.ticker} — ` : ''}{inv.name}</p>
                        <p className="text-xs text-text-tertiary font-mono tabular-nums">
                          <EditableUnits value={inv.units} onSave={async (v) => {
                            await db.investments.update(inv.id, { units: v, updatedAt: new Date().toISOString() } as Partial<Investment>);
                          }} />
                          {' · '}{(weight * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col items-end">
                        <p className="font-mono text-sm font-semibold text-text-primary">{formatCurrency(value, inv.currency || 'AED', 'en-AE', true)}</p>
                        <div className="flex items-center gap-1 text-xs text-text-tertiary">
                          <span>@</span>
                          <EditableCurrency
                            value={inv.currentPricePerUnit}
                            currency={inv.currency || 'AED'}
                            size="sm"
                            align="right"
                            ariaLabel={`Edit price for ${inv.name}`}
                            onSave={async (v) => {
                              await db.investments.update(inv.id, { currentPricePerUnit: v, updatedAt: new Date().toISOString() } as Partial<Investment>);
                            }}
                          />
                        </div>
                        <p className={`font-mono text-xs ${gain >= 0 ? 'text-positive' : 'text-negative'}`}>{gain >= 0 ? '+' : ''}{formatCurrency(gain, inv.currency || 'AED', 'en-AE', true)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(inv.id)} aria-label="Delete"><Trash2 size={13} /></Button>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader><CardTitle>Allocation</CardTitle></CardHeader>
            {pieData.length > 0 ? <AllocationPie data={pieData} height={240} /> : <div className="h-40 flex items-center justify-center text-sm text-text-tertiary">No data</div>}
          </Card>
        </div>
      </div>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.investments.delete(deleteId); setDeleteId(null); } }} title="Remove Holding" message="This will permanently remove this holding." confirmLabel="Remove" destructive />
    </PageLayout>
  );
}
