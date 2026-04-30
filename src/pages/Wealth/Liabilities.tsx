import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { db, type Liability } from '../../db/schema';
import { Card, Button, Modal, Input, Select, NumberInput, EmptyState, Skeleton, ConfirmDialog } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatDate } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
      <Controller name="outstandingBalance" control={control} render={({ field }) => <NumberInput label="Outstanding Balance" prefix="AED" value={field.value} onChange={field.onChange} step={1000} />} />
      <Controller name="originalBalance" control={control} render={({ field }) => <NumberInput label="Original Balance" prefix="AED" value={field.value} onChange={field.onChange} step={1000} />} />
      <Controller name="interestRate" control={control} render={({ field }) => <NumberInput label="Interest Rate" suffix="%" value={field.value * 100} onChange={v => field.onChange(v / 100)} step={0.1} />} />
      <Controller name="monthlyPayment" control={control} render={({ field }) => <NumberInput label="Monthly Payment" prefix="AED" value={field.value} onChange={field.onChange} step={100} />} />
      <Input label="Start Date" type="date" {...register('startDate')} />
      <Input label="End Date (optional)" type="date" {...register('endDate')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{liability ? 'Save' : 'Add Liability'}</Button>
      </div>
    </form>
  );
}

export default function Liabilities() {
  const liabilities = useLiveQuery(() => db.liabilities.toArray(), []);
  const [editLiability, setEditLiability] = useState<Liability | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const total = liabilities?.reduce((s, l) => s + l.outstandingBalance, 0) ?? 0;

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Liability</Button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Total Outstanding</p><p className="font-mono text-2xl font-bold text-negative">{formatCurrency(total, 'AED', 'en-AE', true)}</p></Card>
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
                        <p className="text-xs text-text-tertiary">{l.lender} · {(l.interestRate * 100).toFixed(2)}% · {formatCurrency(l.monthlyPayment, 'AED', 'en-AE', true)}/mo</p>
                        {l.endDate && <p className="text-xs text-text-tertiary">Ends {formatDate(l.endDate)}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-semibold text-negative">{formatCurrency(l.outstandingBalance, 'AED', 'en-AE', true)}</p>
                        <Button variant="ghost" size="sm" onClick={() => setEditLiability(l)}><Edit2 size={13} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteId(l.id)}><Trash2 size={13} /></Button>
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
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.liabilities.delete(deleteId); setDeleteId(null); } }} title="Delete Liability" message="This will permanently remove this liability." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
