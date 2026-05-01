import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, Zap } from 'lucide-react';
import { db, type Liability } from '../../db/schema';
import { Card, Button, Modal, Input, Select, NumberInput, EmptyState, Skeleton, ConfirmDialog, EditableCurrency } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatDate, formatMonths } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Liability with optional runtime overpaymentMonthly field (stored alongside other fields).
type LiabilityWithOverpay = Liability & { overpaymentMonthly?: number };

const schema = z.object({
  name: z.string().min(1),
  type: z.string(),
  outstandingBalance: z.number().min(0),
  originalBalance: z.number().min(0),
  interestRate: z.number().min(0),
  monthlyPayment: z.number().min(0),
  startDate: z.string(),
  endDate: z.string().optional(),
  lender: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function LiabilityForm({ liability, onClose }: { liability?: Liability; onClose: () => void }) {
  const { currency } = useAppStore();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: liability ? { ...liability } : { type: 'mortgage', outstandingBalance: 0, originalBalance: 0, interestRate: 0.035, monthlyPayment: 0, startDate: new Date().toISOString().slice(0, 10) },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (liability) {
      await db.liabilities.update(liability.id, { ...data, updatedAt: ts } as any);
    } else {
      await db.liabilities.add({ ...data as any, id: generateId(), createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Name" error={errors.name?.message} {...register('name')} placeholder="e.g. ENBD Home Finance" />
      <Select label="Type" options={[{value:'mortgage',label:'Mortgage'},{value:'personal_loan',label:'Personal Loan'},{value:'car_loan',label:'Car Loan'},{value:'student_loan',label:'Student Loan'},{value:'credit_card',label:'Credit Card'},{value:'family_loan',label:'Family Loan'},{value:'other',label:'Other'}]} {...register('type')} />
      <Input label="Lender" {...register('lender')} />
      <Controller name="outstandingBalance" control={control} render={({ field }) => <NumberInput label="Outstanding Balance" prefix={currency} value={field.value} onChange={field.onChange} step={1000} />} />
      <Controller name="originalBalance" control={control} render={({ field }) => <NumberInput label="Original Balance" prefix={currency} value={field.value} onChange={field.onChange} step={1000} />} />
      <Controller name="interestRate" control={control} render={({ field }) => <NumberInput label="Interest Rate" suffix="%" value={field.value * 100} onChange={v => field.onChange(v / 100)} step={0.1} />} />
      <Controller name="monthlyPayment" control={control} render={({ field }) => <NumberInput label="Monthly Payment" prefix={currency} value={field.value} onChange={field.onChange} step={100} />} />
      <Input label="Start Date" type="date" {...register('startDate')} />
      <Input label="End Date (optional)" type="date" {...register('endDate')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{liability ? 'Save' : 'Add Liability'}</Button>
      </div>
    </form>
  );
}

function monthsToPayoff(balance: number, monthlyRate: number, payment: number): number {
  if (balance <= 0) return 0;
  if (monthlyRate <= 0) return payment > 0 ? Math.ceil(balance / payment) : Infinity;
  if (payment <= balance * monthlyRate) return Infinity;
  return -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate);
}

function totalInterest(balance: number, payment: number, months: number): number {
  if (!isFinite(months)) return Infinity;
  return Math.max(0, payment * months - balance);
}

function OverpayModal({ liability, onClose }: { liability: LiabilityWithOverpay; onClose: () => void }) {
  const { currency, locale } = useAppStore();
  const initialOverpay = liability.overpaymentMonthly ?? 0;
  const [extra, setExtra] = useState<number>(initialOverpay);
  const [saving, setSaving] = useState(false);

  const monthlyRate = liability.interestRate / 12;

  const baseMonths = useMemo(
    () => monthsToPayoff(liability.outstandingBalance, monthlyRate, liability.monthlyPayment),
    [liability.outstandingBalance, monthlyRate, liability.monthlyPayment]
  );
  const newMonths = useMemo(
    () => monthsToPayoff(liability.outstandingBalance, monthlyRate, liability.monthlyPayment + extra),
    [liability.outstandingBalance, monthlyRate, liability.monthlyPayment, extra]
  );

  const baseInterest = useMemo(
    () => totalInterest(liability.outstandingBalance, liability.monthlyPayment, baseMonths),
    [liability.outstandingBalance, liability.monthlyPayment, baseMonths]
  );
  const newInterest = useMemo(
    () => totalInterest(liability.outstandingBalance, liability.monthlyPayment + extra, newMonths),
    [liability.outstandingBalance, liability.monthlyPayment, extra, newMonths]
  );

  const monthsSaved = isFinite(baseMonths) && isFinite(newMonths) ? Math.max(0, baseMonths - newMonths) : 0;
  const interestSaved = isFinite(baseInterest) && isFinite(newInterest) ? Math.max(0, baseInterest - newInterest) : 0;

  const fmt = (m: number) => isFinite(m) ? formatMonths(Math.ceil(m)) : '—';

  const apply = async () => {
    setSaving(true);
    try {
      await db.liabilities.update(liability.id, { overpaymentMonthly: extra, updatedAt: new Date().toISOString() } as Partial<Liability> & { overpaymentMonthly: number });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-raised rounded-xl p-3">
          <p className="text-xs text-text-tertiary">Balance</p>
          <p className="font-mono text-sm font-semibold text-text-primary">{formatCurrency(liability.outstandingBalance, currency, locale, true)}</p>
        </div>
        <div className="bg-surface-raised rounded-xl p-3">
          <p className="text-xs text-text-tertiary">Rate</p>
          <p className="font-mono text-sm font-semibold text-text-primary">{(liability.interestRate * 100).toFixed(2)}%</p>
        </div>
        <div className="bg-surface-raised rounded-xl p-3">
          <p className="text-xs text-text-tertiary">Payment</p>
          <p className="font-mono text-sm font-semibold text-text-primary">{formatCurrency(liability.monthlyPayment, currency, locale, true)}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="overpay-slider" className="text-sm font-medium text-text-secondary">Extra monthly overpayment</label>
          <span className="font-mono text-sm font-semibold text-accent">{formatCurrency(extra, currency, locale, false)}</span>
        </div>
        <input
          id="overpay-slider"
          type="range"
          min={0}
          max={5000}
          step={100}
          value={extra}
          onChange={e => setExtra(Number(e.target.value))}
          className="w-full accent-accent"
          aria-label="Extra monthly overpayment"
        />
        <div className="flex justify-between text-xs text-text-tertiary mt-1">
          <span>{formatCurrency(0, currency, locale, false)}</span>
          <span>{formatCurrency(5000, currency, locale, false)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-surface-raised">
          <p className="text-xs text-text-tertiary mb-1">Without overpayment</p>
          <p className="text-xs text-text-secondary">Time to pay off</p>
          <p className="font-mono text-sm font-semibold text-text-primary mb-2">{fmt(baseMonths)}</p>
          <p className="text-xs text-text-secondary">Total interest</p>
          <p className="font-mono text-sm font-semibold text-negative">{isFinite(baseInterest) ? formatCurrency(baseInterest, currency, locale, true) : '—'}</p>
        </Card>
        <Card className="bg-accent-light">
          <p className="text-xs text-text-tertiary mb-1">With overpayment</p>
          <p className="text-xs text-text-secondary">Time to pay off</p>
          <p className="font-mono text-sm font-semibold text-text-primary mb-2">{fmt(newMonths)}</p>
          <p className="text-xs text-text-secondary">Total interest</p>
          <p className="font-mono text-sm font-semibold text-positive">{isFinite(newInterest) ? formatCurrency(newInterest, currency, locale, true) : '—'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div>
          <p className="text-xs text-text-tertiary">Months saved</p>
          <p className="font-mono text-base font-bold text-positive">{Math.ceil(monthsSaved)}</p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Interest saved</p>
          <p className="font-mono text-base font-bold text-positive">{formatCurrency(interestSaved, currency, locale, true)}</p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="button" onClick={apply} disabled={saving}>Apply overpayment</Button>
      </div>
    </div>
  );
}

export default function Liabilities() {
  const { currency, locale } = useAppStore();
  const liabilities = useLiveQuery(() => db.liabilities.toArray() as unknown as Promise<LiabilityWithOverpay[]>, []);
  const [editLiability, setEditLiability] = useState<Liability | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [optimizeLiability, setOptimizeLiability] = useState<LiabilityWithOverpay | null>(null);

  const total = liabilities?.reduce((s, l) => s + l.outstandingBalance, 0) ?? 0;

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Liability</Button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Total Outstanding</p><p className="font-mono text-2xl font-bold text-negative">{formatCurrency(total, currency, locale, true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Liabilities</p><p className="font-mono text-2xl font-bold text-text-primary">{liabilities?.length ?? 0}</p></Card>
      </div>

      {!liabilities ? <Skeleton className="h-48" />
        : liabilities.length === 0 ? <EmptyState title="No liabilities" description="Add your home finance, loans, or credit cards." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add Liability</Button>} />
        : (
          <Card>
            <div className="divide-y divide-border">
              {liabilities.map(l => {
                const paydownPct = l.originalBalance > 0 ? (l.originalBalance - l.outstandingBalance) / l.originalBalance : 0;
                return (
                  <div key={l.id} className="py-4 px-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{l.name}</p>
                        <p className="text-xs text-text-tertiary">{l.lender} · {(l.interestRate * 100).toFixed(2)}% · {formatCurrency(l.monthlyPayment, currency, locale, true)}/mo</p>
                        {l.endDate && <p className="text-xs text-text-tertiary">Ends {formatDate(l.endDate)}</p>}
                        {l.overpaymentMonthly && l.overpaymentMonthly > 0 && (
                          <p className="text-xs text-positive">+{formatCurrency(l.overpaymentMonthly, currency, locale, true)}/mo overpayment</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <EditableCurrency
                          value={l.outstandingBalance}
                          size="sm"
                          align="right"
                          compact
                          ariaLabel={`Edit outstanding balance for ${l.name}`}
                          className="text-negative"
                          onSave={async (v) => {
                            await db.liabilities.update(l.id, { outstandingBalance: v, updatedAt: new Date().toISOString() } as Partial<Liability>);
                          }}
                        />
                        <Button variant="ghost" size="sm" onClick={() => setOptimizeLiability(l)} aria-label={`Optimize ${l.name}`}><Zap size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditLiability(l)} aria-label={`Edit ${l.name}`}><Edit2 size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(l.id)} aria-label={`Delete ${l.name}`}><Trash2 size={13} /></Button>
                      </div>
                    </div>
                    <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                      <div className="h-full bg-positive rounded-full" style={{ width: `${paydownPct * 100}%` }} />
                    </div>
                    <p className="text-xs text-text-tertiary mt-1">{(paydownPct * 100).toFixed(0)}% paid off</p>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Liability"><LiabilityForm onClose={() => setShowAdd(false)} /></Modal>
      <Modal open={!!editLiability} onClose={() => setEditLiability(null)} title="Edit Liability">{editLiability && <LiabilityForm liability={editLiability} onClose={() => setEditLiability(null)} />}</Modal>
      <Modal open={!!optimizeLiability} onClose={() => setOptimizeLiability(null)} title={optimizeLiability ? `Optimize ${optimizeLiability.name}` : 'Optimize'} size="lg">
        {optimizeLiability && <OverpayModal liability={optimizeLiability} onClose={() => setOptimizeLiability(null)} />}
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.liabilities.delete(deleteId); setDeleteId(null); } }} title="Delete Liability" message="This will permanently remove this liability." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
