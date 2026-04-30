import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { db, type InsurancePolicy } from '../../db/schema';
import { Card, Button, Modal, Input, Select, NumberInput, EmptyState, Skeleton, ConfirmDialog, Badge } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatDate } from '../../lib/format';
import { generateId } from '../../lib/utils';
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
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: policy ? { ...policy } : { type: 'life', coverAmount: 0, monthlyPremium: 0, startDate: new Date().toISOString().slice(0, 10) },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (policy) {
      await db.insurancePolicies.update(policy.id, { ...data, updatedAt: ts });
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
      <Controller name="coverAmount" control={control} render={({ field }) => <NumberInput label="Cover Amount" prefix="AED" value={field.value} onChange={field.onChange} step={10000} />} />
      <Controller name="monthlyPremium" control={control} render={({ field }) => <NumberInput label="Monthly Premium" prefix="AED" value={field.value} onChange={field.onChange} step={10} />} />
      <Input label="Start Date" type="date" {...register('startDate')} />
      <Input label="Renewal Date (optional)" type="date" {...register('renewalDate')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{policy ? 'Save' : 'Add Policy'}</Button>
      </div>
    </form>
  );
}

export default function Insurance() {
  const policies = useLiveQuery(() => db.insurancePolicies.filter(p => p.isActive).toArray(), []);
  const [editPolicy, setEditPolicy] = useState<InsurancePolicy | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalCover = policies?.reduce((s, p) => s + p.coverAmount, 0) ?? 0;
  const totalPremium = policies?.reduce((s, p) => s + p.monthlyPremium, 0) ?? 0;

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Policy</Button>}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Total Cover</p><p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(totalCover, 'AED', 'en-AE', true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Monthly Premiums</p><p className="font-mono text-xl font-bold text-negative">{formatCurrency(totalPremium, 'AED', 'en-AE', true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Annual Premiums</p><p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(totalPremium * 12, 'AED', 'en-AE', true)}</p></Card>
      </div>

      {!policies ? <Skeleton className="h-48" />
        : policies.length === 0 ? <EmptyState title="No policies" description="Add your insurance policies." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add Policy</Button>} />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map(p => (
              <Card key={p.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <Badge variant="default">{p.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditPolicy(p)}><Edit2 size={13} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(p.id)}><Trash2 size={13} /></Button>
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-primary">{p.name}</p>
                <p className="text-xs text-text-tertiary">{p.provider}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-text-tertiary">Cover</span><span className="font-mono font-semibold text-text-primary">{formatCurrency(p.coverAmount, 'AED', 'en-AE', true)}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-tertiary">Premium</span><span className="font-mono font-semibold text-negative">{formatCurrency(p.monthlyPremium, 'AED', 'en-AE', true)}/mo</span></div>
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
