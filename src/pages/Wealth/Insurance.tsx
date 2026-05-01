import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';
import { db, type InsurancePolicy } from '../../db/schema';
import { Card, CardHeader, CardTitle, Button, Modal, Input, Select, NumberInput, EmptyState, Skeleton, ConfirmDialog, Badge } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatDate } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(1),
  type: z.string(),
  provider: z.string().min(1),
  coverAmount: z.number().min(0),
  monthlyPremium: z.number().min(0),
  startDate: z.string(),
  renewalDate: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const INS_TYPES = ['life','critical_illness','income_protection','home_buildings','home_contents','travel','car','private_medical','pet','other'];

function InsuranceForm({ policy, onClose }: { policy?: InsurancePolicy; onClose: () => void }) {
  const { currency } = useAppStore();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: policy ? { ...policy } : { type: 'life', coverAmount: 0, monthlyPremium: 0, startDate: new Date().toISOString().slice(0, 10) },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (policy) {
      await db.insurancePolicies.update(policy.id, { ...data, updatedAt: ts } as any);
    } else {
      await db.insurancePolicies.add({ ...data as any, id: generateId(), isActive: true, createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Policy Name" error={errors.name?.message} {...register('name')} />
      <Select label="Type" options={INS_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} {...register('type')} />
      <Input label="Provider" error={errors.provider?.message} {...register('provider')} />
      <Controller name="coverAmount" control={control} render={({ field }) => <NumberInput label="Cover Amount" prefix={currency} value={field.value} onChange={field.onChange} step={10000} />} />
      <Controller name="monthlyPremium" control={control} render={({ field }) => <NumberInput label="Monthly Premium" prefix={currency} value={field.value} onChange={field.onChange} step={10} />} />
      <Input label="Start Date" type="date" {...register('startDate')} />
      <Input label="Renewal Date (optional)" type="date" {...register('renewalDate')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{policy ? 'Save' : 'Add Policy'}</Button>
      </div>
    </form>
  );
}

interface CoverageRowProps {
  label: string;
  current: number;
  target: number;
  currency: string;
  locale: string;
}

function CoverageRow({ label, current, target, currency, locale }: CoverageRowProps) {
  const gap = Math.max(0, target - current);
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : (current > 0 ? 100 : 0);
  const surplus = current > target;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">{label}</span>
          {gap > 0 ? (
            <Badge variant="warning"><ShieldAlert size={10} className="mr-1" />Gap</Badge>
          ) : (
            <Badge variant="positive">Covered</Badge>
          )}
        </div>
        <span className="text-xs text-text-tertiary font-mono">
          {formatCurrency(current, currency, locale, true)} / {target > 0 ? formatCurrency(target, currency, locale, true) : '—'}
        </span>
      </div>
      <div className="relative h-2 bg-surface-raised rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full rounded-full ${surplus ? 'bg-positive' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {gap > 0 && (
        <p className="text-xs text-text-tertiary">
          Gap: <span className="text-warning font-mono font-semibold">{formatCurrency(gap, currency, locale, true)}</span>
        </p>
      )}
    </div>
  );
}

export default function Insurance() {
  const { currency, locale } = useAppStore();
  const policies = useLiveQuery(() => db.insurancePolicies.filter(p => p.isActive).toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const [editPolicy, setEditPolicy] = useState<InsurancePolicy | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Calculate household monthly expenses (past 3 months avg) and large debts.
  const coverageData = useLiveQuery(async () => {
    const today = new Date();
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    const txs = await db.transactions
      .where('date')
      .above(threeMonthsAgo.toISOString().slice(0, 10))
      .toArray();
    const expensesTotal = txs
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const monthlyExpenses = expensesTotal / 3;
    const annualExpenses = monthlyExpenses * 12;

    const liabilities = await db.liabilities.toArray();
    const largeDebts = liabilities
      .filter(l => l.type === 'mortgage' || l.outstandingBalance > 100_000)
      .reduce((s, l) => s + l.outstandingBalance, 0);

    return { monthlyExpenses, annualExpenses, largeDebts };
  }, []);

  const totalCover = policies?.reduce((s, p) => s + p.coverAmount, 0) ?? 0;
  const totalPremium = policies?.reduce((s, p) => s + p.monthlyPremium, 0) ?? 0;

  const lifeCover = policies?.filter(p => p.type === 'life').reduce((s, p) => s + p.coverAmount, 0) ?? 0;
  const incomeProtCover = policies?.filter(p => p.type === 'income_protection').reduce((s, p) => s + p.coverAmount, 0) ?? 0;
  const ciCover = policies?.filter(p => p.type === 'critical_illness').reduce((s, p) => s + p.coverAmount, 0) ?? 0;

  const annualExpenses = coverageData?.annualExpenses ?? 0;
  const largeDebts = coverageData?.largeDebts ?? 0;
  const primaryIncome = settings?.primaryIncome ?? 0;
  const secondaryIncome = settings?.secondaryIncome ?? 0;
  const monthlyHouseholdIncome = (primaryIncome + secondaryIncome) / 12;

  const lifeTarget = annualExpenses * 10 + largeDebts;
  const incomeProtTarget = monthlyHouseholdIncome * 0.6 * 12; // annualised cover proxy
  const ciTarget = annualExpenses * 3; // 3 years of expenses as baseline

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Policy</Button>}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Total Cover</p><p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(totalCover, currency, locale, true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Monthly Premiums</p><p className="font-mono text-xl font-bold text-negative">{formatCurrency(totalPremium, currency, locale, true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Annual Premiums</p><p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(totalPremium * 12, currency, locale, true)}</p></Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Coverage Analysis</CardTitle>
          <span className="text-xs text-text-tertiary">Recommended cover vs. your current policies</span>
        </CardHeader>
        <div className="space-y-5">
          <CoverageRow label="Life cover" current={lifeCover} target={lifeTarget} currency={currency} locale={locale} />
          <CoverageRow label="Income protection (annual)" current={incomeProtCover} target={incomeProtTarget} currency={currency} locale={locale} />
          <CoverageRow label="Critical illness" current={ciCover} target={ciTarget} currency={currency} locale={locale} />
        </div>
        {!coverageData && <p className="text-xs text-text-tertiary mt-3">Loading expense data…</p>}
      </Card>

      {!policies ? <Skeleton className="h-48" />
        : policies.length === 0 ? <EmptyState title="No policies" description="Add your insurance policies." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add Policy</Button>} />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map(p => (
              <Card key={p.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <Badge variant="default">{p.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditPolicy(p)} aria-label={`Edit ${p.name}`}><Edit2 size={13} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)} aria-label={`Delete ${p.name}`}><Trash2 size={13} /></Button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-primary">{p.name}</p>
                <p className="text-xs text-text-tertiary">{p.provider}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-text-tertiary">Cover</span><span className="font-mono font-semibold text-text-primary">{formatCurrency(p.coverAmount, currency, locale, true)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-tertiary">Premium</span><span className="font-mono font-semibold text-negative">{formatCurrency(p.monthlyPremium, currency, locale, true)}/mo</span></div>
                  {p.renewalDate && <div className="flex justify-between text-xs"><span className="text-text-tertiary">Renewal</span><span className="text-text-secondary">{formatDate(p.renewalDate)}</span></div>}
                </div>
              </Card>
            ))}
          </div>
        )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Insurance Policy"><InsuranceForm onClose={() => setShowAdd(false)} /></Modal>
      <Modal open={!!editPolicy} onClose={() => setEditPolicy(null)} title="Edit Policy">{editPolicy && <InsuranceForm policy={editPolicy} onClose={() => setEditPolicy(null)} />}</Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.insurancePolicies.delete(deleteId); setDeleteId(null); } }} title="Delete Policy" message="This will permanently remove this policy." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
