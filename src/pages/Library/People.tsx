import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { db, type Person } from '../../db/schema';
import { Card, Button, Modal, Input, Select, EmptyState, Skeleton, ConfirmDialog, Badge } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatDate } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['primary', 'secondary', 'child', 'dependent']),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  lifeExpectancy: z.number().optional(),
  retirementAge: z.number().optional(),
});
type FormData = z.infer<typeof schema>;

function PersonForm({ person, onClose }: { person?: Person; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: person ? { name: person.name, role: person.role, dateOfBirth: person.dateOfBirth, lifeExpectancy: person.lifeExpectancy, retirementAge: person.retirementAge } : { role: 'secondary', dateOfBirth: '' },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (person) {
      await db.people.update(person.id, { ...data, updatedAt: ts } as any);
    } else {
      await db.people.add({ ...data as any, id: generateId(), createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Name" error={errors.name?.message} {...register('name')} />
      <Select label="Role" options={[{value:'primary',label:'Primary'},{value:'secondary',label:'Secondary'},{value:'child',label:'Child'},{value:'dependent',label:'Dependent'}]} {...register('role')} />
      <Input label="Date of Birth" type="date" error={errors.dateOfBirth?.message} {...register('dateOfBirth')} />
      <Input label="Life Expectancy (age)" type="number" {...register('lifeExpectancy', { valueAsNumber: true })} />
      <Input label="Retirement Age" type="number" {...register('retirementAge', { valueAsNumber: true })} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{person ? 'Save' : 'Add Person'}</Button>
      </div>
    </form>
  );
}

export default function People() {
  const people = useLiveQuery(() => db.people.toArray(), []);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm" aria-label="Add person"><Plus size={14} className="mr-1" />Add Person</Button>}>
      {!people ? <Skeleton className="h-64" />
        : people.length === 0 ? <EmptyState title="No people" description="Add household members to personalise projections." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add</Button>} />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map(p => {
              const age = p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;
              return (
                <Card key={p.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center text-accent font-bold text-sm">{p.name.slice(0, 1)}</div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" aria-label={`Edit ${p.name}`} onClick={() => setEditPerson(p)}><Edit2 size={13} /></Button>
                      <Button variant="ghost" size="sm" aria-label={`Delete ${p.name}`} onClick={() => setDeleteId(p.id)}><Trash2 size={13} /></Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{p.name}</p>
                    <Badge variant="default" className="text-xs mt-1">{p.role}</Badge>
                  </div>
                  {p.dateOfBirth && <p className="text-xs text-text-tertiary">DOB: {formatDate(p.dateOfBirth)} · Age {age}</p>}
                  {p.retirementAge && <p className="text-xs text-text-tertiary">Retirement: age {p.retirementAge}</p>}
                </Card>
              );
            })}
          </div>
        )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Person"><PersonForm onClose={() => setShowAdd(false)} /></Modal>
      <Modal open={!!editPerson} onClose={() => setEditPerson(null)} title="Edit Person">{editPerson && <PersonForm person={editPerson} onClose={() => setEditPerson(null)} />}</Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.people.delete(deleteId); setDeleteId(null); } }} title="Delete Person" message="This will permanently remove this person." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
