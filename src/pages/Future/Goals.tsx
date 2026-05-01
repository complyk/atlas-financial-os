import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { db, type Goal, type GoalPriority } from '../../db/schema';
import { Card, Button, Modal, Input, Select, NumberInput, EmptyState, Skeleton, ConfirmDialog, Badge, EditableCurrency } from '../../components/ui';
import { GoalGauge } from '../../components/charts/GoalGauge';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatDate } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const PRIORITY_LABELS: Record<GoalPriority, string> = { essential: 'Essential', important: 'Important', nice_to_have: 'Nice to Have' };
const PRIORITY_VARIANTS: Record<GoalPriority, 'negative' | 'warning' | 'default'> = { essential: 'negative', important: 'warning', nice_to_have: 'default' };

const schema = z.object({
  name: z.string().min(1),
  type: z.string(),
  priority: z.string(),
  targetAmount: z.number().min(1),
  currentAmount: z.number().min(0),
  monthlyContribution: z.number().min(0),
  targetDate: z.string(),
  notes: z.string().optional(),
  color: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function GoalForm({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: goal ? { ...goal } : { type: 'other', priority: 'important', targetAmount: 0, currentAmount: 0, monthlyContribution: 0, targetDate: '', color: '#3b82f6' },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (goal) {
      await db.goals.update(goal.id, { ...data, updatedAt: ts } as any);
    } else {
      await db.goals.add({ ...data as any, id: generateId(), isAchieved: false, createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  const goalTypes = ['emergency_fund','retirement','house_deposit','education','holiday','car','home_improvement','debt_payoff','other'];
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Goal Name" error={errors.name?.message} {...register('name')} placeholder="e.g. Emergency Fund" />
      <Select label="Type" options={goalTypes.map(t => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} {...register('type')} />
      <Select label="Priority" options={[{value:'essential',label:'Essential'},{value:'important',label:'Important'},{value:'nice_to_have',label:'Nice to Have'}]} {...register('priority')} />
      <Controller name="targetAmount" control={control} render={({ field }) => <NumberInput label="Target Amount" prefix="AED" value={field.value} onChange={field.onChange} step={1000} />} />
      <Controller name="currentAmount" control={control} render={({ field }) => <NumberInput label="Current Amount" prefix="AED" value={field.value} onChange={field.onChange} step={100} />} />
      <Controller name="monthlyContribution" control={control} render={({ field }) => <NumberInput label="Monthly Contribution" prefix="AED" value={field.value} onChange={field.onChange} step={100} />} />
      <Input label="Target Date" type="date" {...register('targetDate')} />
      <div className="flex gap-2 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">Colour</label>
          <input type="color" {...register('color')} className="h-10 w-10 rounded cursor-pointer border border-border" />
        </div>
        <Input label="Notes (optional)" {...register('notes')} className="flex-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{goal ? 'Save' : 'Add Goal'}</Button>
      </div>
    </form>
  );
}

export default function Goals() {
  const goals = useLiveQuery(() => db.goals.filter(g => !g.isAchieved).toArray(), []);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = goals ? [...goals].sort((a, b) => {
    const p: Record<string, number> = { essential: 0, important: 1, nice_to_have: 2 };
    return (p[a.priority] ?? 2) - (p[b.priority] ?? 2);
  }) : [];

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Goal</Button>}>
      {!goals ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} className="h-52 rounded-2xl"/>)}</div>
      ) : goals.length === 0 ? (
        <EmptyState title="No goals" description="Add goals like emergency fund, retirement, or savings targets." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add Goal</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(goal => {
            const progress = goal.targetAmount > 0 ? goal.currentAmount / goal.targetAmount : 0;
            const remaining = goal.targetAmount - goal.currentAmount;
            const monthsLeft = goal.monthlyContribution > 0 ? Math.ceil(remaining / goal.monthlyContribution) : null;
            return (
              <Card key={goal.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <Badge variant={PRIORITY_VARIANTS[goal.priority]}>{PRIORITY_LABELS[goal.priority]}</Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditGoal(goal)}><Edit2 size={13} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteId(goal.id)}><Trash2 size={13} /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GoalGauge progress={progress} size={60} color={goal.color || 'var(--color-accent)'} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text-primary">{goal.name}</p>
                    <p className="text-xs text-text-tertiary">{(progress * 100).toFixed(0)}% complete</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-tertiary">Current</span>
                    <EditableCurrency
                      value={goal.currentAmount}
                      size="sm"
                      align="right"
                      compact
                      ariaLabel={`Edit current amount for ${goal.name}`}
                      onSave={async (v) => {
                        await db.goals.update(goal.id, { currentAmount: v, updatedAt: new Date().toISOString() } as Partial<Goal>);
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs"><span className="text-text-tertiary">Target</span><span className="font-mono font-semibold text-text-primary">{formatCurrency(goal.targetAmount, 'AED', 'en-AE', true)}</span></div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-text-tertiary">Monthly</span>
                    <EditableCurrency
                      value={goal.monthlyContribution}
                      size="sm"
                      align="right"
                      compact
                      className="text-accent"
                      ariaLabel={`Edit monthly contribution for ${goal.name}`}
                      onSave={async (v) => {
                        await db.goals.update(goal.id, { monthlyContribution: v, updatedAt: new Date().toISOString() } as Partial<Goal>);
                      }}
                    />
                  </div>
                  {goal.targetDate && <div className="flex justify-between text-xs"><span className="text-text-tertiary">Target</span><span className="text-text-secondary">{formatDate(goal.targetDate)}</span></div>}
                  {monthsLeft !== null && <div className="flex justify-between text-xs"><span className="text-text-tertiary">ETA</span><span className="text-text-secondary">{monthsLeft > 0 ? `~${monthsLeft}mo` : 'Achieved!'}</span></div>}
                </div>
                <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, progress * 100)}%`, background: goal.color || 'var(--color-accent)' }} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Goal"><GoalForm onClose={() => setShowAdd(false)} /></Modal>
      <Modal open={!!editGoal} onClose={() => setEditGoal(null)} title="Edit Goal">{editGoal && <GoalForm goal={editGoal} onClose={() => setEditGoal(null)} />}</Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.goals.delete(deleteId); setDeleteId(null); } }} title="Delete Goal" message="This will permanently remove this goal." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
