import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { db, type LifeEvent } from '../../db/schema';
import { Card, Button, Modal, Input, Select, NumberInput, EmptyState, Skeleton, ConfirmDialog } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(1),
  type: z.string(),
  date: z.string().min(1, 'Date required').refine(s => !!Date.parse(s), 'Invalid date'),
  estimatedCost: z.number().optional(),
  ongoingMonthlyCostDelta: z.number().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const EVENT_TYPES = ['child_nursery','child_school_state','child_school_private','child_university','child_leave_home','retirement_primary','retirement_secondary','mortgage_end','house_move','new_child','career_change','sabbatical','inheritance','large_purchase','custom'];

function EventForm({ event, onClose }: { event?: LifeEvent; onClose: () => void }) {
  const { currency } = useAppStore();
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: event ? { ...event } : { type: 'custom', date: '' },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (event) {
      await db.lifeEvents.update(event.id, { ...data, updatedAt: ts } as any);
    } else {
      await db.lifeEvents.add({ ...data as any, id: generateId(), isActive: true, createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Event Name" error={errors.name?.message} {...register('name')} />
      <Select label="Type" options={EVENT_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }))} {...register('type')} />
      <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
      <Controller name="estimatedCost" control={control} render={({ field }) => <NumberInput label="Estimated One-Off Cost (optional)" prefix={currency} value={field.value || ''} onChange={field.onChange} step={1000} />} />
      <Controller name="ongoingMonthlyCostDelta" control={control} render={({ field }) => <NumberInput label="Monthly Cost Change (optional, - = saving)" prefix={currency} value={field.value || ''} onChange={field.onChange} step={100} />} />
      <Input label="Notes" {...register('notes')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{event ? 'Save' : 'Add Event'}</Button>
      </div>
    </form>
  );
}

export default function Timeline() {
  const { currency, locale } = useAppStore();
  const events = useLiveQuery(() => db.lifeEvents.filter(e => e.isActive).sortBy('date'), []);
  const [editEvent, setEditEvent] = useState<LifeEvent | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Group by year
  const byYear = events ? events.reduce((acc, e) => {
    const year = e.date.slice(0, 4);
    if (!acc[year]) acc[year] = [];
    acc[year].push(e);
    return acc;
  }, {} as Record<string, LifeEvent[]>) : {};

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Event</Button>}>
      {!events ? <Skeleton className="h-64" />
        : events.length === 0 ? <EmptyState title="No life events" description="Add milestones like retirement, school, or career changes." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add Event</Button>} />
        : (
          <div className="space-y-8">
            {Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b)).map(([year, evts]) => (
              <div key={year} className="grid grid-cols-[4rem_1fr] gap-4">
                <div className="pt-2">
                  <div className="sticky top-4 text-right">
                    <span className="inline-block text-sm font-bold text-text-secondary bg-surface-raised rounded-md px-2 py-1">{year}</span>
                  </div>
                </div>
                <div className="relative space-y-3 border-l-2 border-border pl-6">
                  {evts.map(e => (
                    <Card key={e.id} className="relative">
                      <div className="absolute -left-[1.85rem] top-5 w-3 h-3 rounded-full bg-accent border-2 border-background" />
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary">{e.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="date"
                              value={e.date}
                              aria-label={`Reschedule ${e.name}`}
                              onChange={async (ev) => {
                                const newDate = ev.target.value;
                                if (!newDate) return;
                                await db.lifeEvents.update(e.id, { date: newDate, updatedAt: new Date().toISOString() });
                              }}
                              className="text-xs bg-surface-raised border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:border-accent"
                            />
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setEditEvent(e)} aria-label={`Edit ${e.name}`}><Edit2 size={13} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteId(e.id)} aria-label={`Delete ${e.name}`}><Trash2 size={13} /></Button>
                        </div>
                      </div>
                      {e.notes && <p className="text-xs text-text-secondary mt-2">{e.notes}</p>}
                      <div className="flex gap-3 mt-2 flex-wrap">
                        {e.estimatedCost ? <span className="text-xs text-negative">One-off: {formatCurrency(e.estimatedCost, currency, locale, true)}</span> : null}
                        {e.ongoingMonthlyCostDelta ? <span className={`text-xs ${e.ongoingMonthlyCostDelta < 0 ? 'text-positive' : 'text-negative'}`}>Monthly: {e.ongoingMonthlyCostDelta > 0 ? '+' : ''}{formatCurrency(e.ongoingMonthlyCostDelta, currency, locale, true)}/mo</span> : null}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Life Event"><EventForm onClose={() => setShowAdd(false)} /></Modal>
      <Modal open={!!editEvent} onClose={() => setEditEvent(null)} title="Edit Event">{editEvent && <EventForm event={editEvent} onClose={() => setEditEvent(null)} />}</Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.lifeEvents.delete(deleteId); setDeleteId(null); } }} title="Delete Event" message="This will permanently remove this event." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
