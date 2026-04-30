import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, Star } from 'lucide-react';
import { db, type Scenario } from '../../db/schema';
import { Card, Button, Modal, Input, EmptyState, Skeleton, ConfirmDialog, Badge } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { generateId } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({ name: z.string().min(1), description: z.string().optional(), color: z.string().optional() });
type FormData = z.infer<typeof schema>;

function ScenarioForm({ scenario, onClose }: { scenario?: Scenario; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: scenario ? { name: scenario.name, description: scenario.description, color: scenario.color } : { color: '#3b82f6' },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (scenario) {
      await db.scenarios.update(scenario.id, { ...data, updatedAt: ts });
    } else {
      await db.scenarios.add({ ...data as any, id: generateId(), isBaseline: false, overrides: {}, createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Name" error={errors.name?.message} {...register('name')} />
      <Input label="Description (optional)" {...register('description')} />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Colour</label>
        <input type="color" {...register('color')} className="h-10 w-10 rounded cursor-pointer border border-border" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{scenario ? 'Save' : 'Add Scenario'}</Button>
      </div>
    </form>
  );
}

export default function Scenarios() {
  const scenarios = useLiveQuery(() => db.scenarios.toArray(), []);
  const [editScenario, setEditScenario] = useState<Scenario | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Scenario</Button>}>
      {!scenarios ? <Skeleton className="h-64" />
        : scenarios.length === 0 ? <EmptyState title="No scenarios" description="Create scenarios to model different financial futures." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add</Button>} />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map(s => (
              <Card key={s.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color || '#3b82f6' }} />
                    {s.isBaseline && <Badge variant="positive">Baseline</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {!s.isBaseline && <Button variant="ghost" size="sm" onClick={() => setEditScenario(s)}><Edit2 size={13} /></Button>}
                    {!s.isBaseline && <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)}><Trash2 size={13} /></Button>}
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                {s.description && <p className="text-xs text-text-secondary">{s.description}</p>}
                {Object.keys(s.overrides).length > 0 && (
                  <div className="mt-2 text-xs text-text-tertiary space-y-0.5">
                    {Object.entries(s.overrides).map(([key, val]) => (
                      <p key={key}>{key}: {JSON.stringify(val)}</p>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Scenario"><ScenarioForm onClose={() => setShowAdd(false)} /></Modal>
      <Modal open={!!editScenario} onClose={() => setEditScenario(null)} title="Edit Scenario">{editScenario && <ScenarioForm scenario={editScenario} onClose={() => setEditScenario(null)} />}</Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.scenarios.delete(deleteId); setDeleteId(null); } }} title="Delete Scenario" message="This will permanently remove this scenario." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
