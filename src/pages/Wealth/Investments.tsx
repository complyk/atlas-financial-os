import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, Pencil, Check, X, Edit2 } from 'lucide-react';
import { db, type Investment, type AssetClass } from '../../db/schema';
import { cn, generateId } from '../../lib/utils';
import { Card, CardHeader, CardTitle, Button, EmptyState, Skeleton, ConfirmDialog, EditableCurrency, Modal, Input, Select, NumberInput } from '../../components/ui';
import { AllocationPie } from '../../components/charts/AllocationPie';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatPercent } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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

const ASSET_CLASSES: AssetClass[] = [
  'global_equity', 'us_equity', 'uk_equity', 'eu_equity', 'emerging_equity',
  'bonds_global', 'bonds_uk', 'bonds_corp', 'property_reit', 'commodities',
  'cash_equiv', 'crypto', 'alternatives', 'other',
];

const CURRENCY_OPTIONS = ['AED', 'USD', 'GBP', 'EUR', 'SAR', 'INR'];

const INVESTMENT_ACCOUNT_TYPES = ['investment', 'isa_stocks', 'pension_dc', 'pension_db', 'crypto'];

const investmentSchema = z.object({
  name: z.string().min(1, 'Name required'),
  ticker: z.string().optional(),
  assetClass: z.string().min(1),
  accountId: z.string().min(1, 'Account required'),
  units: z.number().min(0),
  costBasisPerUnit: z.number().min(0),
  currentPricePerUnit: z.number().min(0),
  currency: z.string().min(1),
  notes: z.string().optional(),
});
type InvestmentFormData = z.infer<typeof investmentSchema>;

function InvestmentForm({ investment, onClose }: { investment?: Investment; onClose: () => void }) {
  const { currency: defaultCurrency } = useAppStore();
  const accounts = useLiveQuery(
    () => db.accounts.filter(a => a.isActive && INVESTMENT_ACCOUNT_TYPES.includes(a.type)).toArray(),
    []
  );
  const { register, handleSubmit, control, formState: { errors } } = useForm<InvestmentFormData>({
    resolver: zodResolver(investmentSchema),
    defaultValues: investment
      ? {
          name: investment.name,
          ticker: investment.ticker,
          assetClass: investment.assetClass,
          accountId: investment.accountId,
          units: investment.units,
          costBasisPerUnit: investment.costBasisPerUnit,
          currentPricePerUnit: investment.currentPricePerUnit,
          currency: investment.currency,
          notes: investment.notes,
        }
      : {
          assetClass: 'global_equity',
          accountId: '',
          units: 0,
          costBasisPerUnit: 0,
          currentPricePerUnit: 0,
          currency: defaultCurrency,
        },
  });

  const onSubmit = async (data: InvestmentFormData) => {
    const ts = new Date().toISOString();
    if (investment) {
      await db.investments.update(investment.id, {
        name: data.name,
        ticker: data.ticker,
        assetClass: data.assetClass as AssetClass,
        accountId: data.accountId,
        units: data.units,
        costBasisPerUnit: data.costBasisPerUnit,
        currentPricePerUnit: data.currentPricePerUnit,
        currency: data.currency,
        notes: data.notes,
        updatedAt: ts,
      } as Partial<Investment>);
    } else {
      await db.investments.add({
        id: generateId(),
        name: data.name,
        ticker: data.ticker,
        assetClass: data.assetClass as AssetClass,
        accountId: data.accountId,
        units: data.units,
        costBasisPerUnit: data.costBasisPerUnit,
        currentPricePerUnit: data.currentPricePerUnit,
        currency: data.currency,
        notes: data.notes,
        createdAt: ts,
        updatedAt: ts,
      });
    }
    onClose();
  };

  const accountOptions = (accounts ?? []).map(a => ({ value: a.id, label: `${a.name}${a.provider ? ' · ' + a.provider : ''}` }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Name" error={errors.name?.message} {...register('name')} placeholder="e.g. Vanguard FTSE Global All Cap" />
      <Input label="Ticker (optional)" {...register('ticker')} placeholder="e.g. VWRL" />
      <Select
        label="Asset Class"
        options={ASSET_CLASSES.map(c => ({ value: c, label: c.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()) }))}
        {...register('assetClass')}
      />
      <Select
        label="Account"
        options={accountOptions.length === 0
          ? [{ value: '', label: 'No investment accounts available' }]
          : [{ value: '', label: 'Select account' }, ...accountOptions]}
        error={errors.accountId?.message}
        {...register('accountId')}
      />
      <div className="grid grid-cols-2 gap-3">
        <Controller name="units" control={control} render={({ field }) => <NumberInput label="Units" value={field.value} onChange={field.onChange} step={1} />} />
        <Controller name="currentPricePerUnit" control={control} render={({ field }) => {
          // currency for prefix is the form's currency - we'll just leave it unprefixed; handled by currency Select
          return <NumberInput label="Current Price / Unit" value={field.value} onChange={field.onChange} step={0.01} />;
        }} />
      </div>
      <Controller name="costBasisPerUnit" control={control} render={({ field }) => <NumberInput label="Cost Basis / Unit" value={field.value} onChange={field.onChange} step={0.01} />} />
      <Select
        label="Currency"
        options={CURRENCY_OPTIONS.map(c => ({ value: c, label: c }))}
        {...register('currency')}
      />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{investment ? 'Save' : 'Add Holding'}</Button>
      </div>
    </form>
  );
}

export default function Investments() {
  const { currency, locale } = useAppStore();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editInvestment, setEditInvestment] = useState<Investment | null>(null);

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
    <PageLayout actions={<Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1" />Add Holding</Button>}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Total Value</p><p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(totalValue, currency, locale, true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Total Cost</p><p className="font-mono text-xl font-bold text-text-secondary">{formatCurrency(totalCost, currency, locale, true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Unrealised P&amp;L</p><p className={`font-mono text-xl font-bold ${totalGain >= 0 ? 'text-positive' : 'text-negative'}`}>{formatCurrency(totalGain, currency, locale, true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Return</p><p className={`font-mono text-xl font-bold ${totalGain >= 0 ? 'text-positive' : 'text-negative'}`}>{totalCost > 0 ? formatPercent(totalGain / totalCost) : '—'}</p></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
            {!data ? <Skeleton className="h-48" /> : data.investments.length === 0 ? (
              <EmptyState
                title="No holdings"
                description="Add your investment positions."
                action={<Button onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1" />Add Holding</Button>}
              />
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
                        <p className="font-mono text-sm font-semibold text-text-primary">{formatCurrency(value, inv.currency || currency, locale, true)}</p>
                        <div className="flex items-center gap-1 text-xs text-text-tertiary">
                          <span>@</span>
                          <EditableCurrency
                            value={inv.currentPricePerUnit}
                            currency={inv.currency || currency}
                            size="sm"
                            align="right"
                            ariaLabel={`Edit price for ${inv.name}`}
                            onSave={async (v) => {
                              await db.investments.update(inv.id, { currentPricePerUnit: v, updatedAt: new Date().toISOString() } as Partial<Investment>);
                            }}
                          />
                        </div>
                        <p className={`font-mono text-xs ${gain >= 0 ? 'text-positive' : 'text-negative'}`}>{gain >= 0 ? '+' : ''}{formatCurrency(gain, inv.currency || currency, locale, true)}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setEditInvestment(inv)} aria-label={`Edit ${inv.name}`}><Edit2 size={13} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(inv.id)} aria-label={`Delete ${inv.name}`}><Trash2 size={13} /></Button>
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

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Holding">
        <InvestmentForm onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editInvestment} onClose={() => setEditInvestment(null)} title="Edit Holding">
        {editInvestment && <InvestmentForm investment={editInvestment} onClose={() => setEditInvestment(null)} />}
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.investments.delete(deleteId); setDeleteId(null); } }} title="Remove Holding" message="This will permanently remove this holding." confirmLabel="Remove" destructive />
    </PageLayout>
  );
}
