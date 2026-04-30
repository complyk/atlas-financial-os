import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, ChevronRight } from 'lucide-react';
import { db, type Category } from '../../db/schema';
import { Card, Button, Modal, Input, Select, EmptyState, Skeleton, ConfirmDialog, Badge } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { generateId } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({ name: z.string().min(1), type: z.string(), color: z.string().optional(), icon: z.string().optional() });
type FormData = z.infer<typeof schema>;

function CategoryForm({ category, parentId, onClose }: { category?: Category; parentId?: string; onClose: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: category ? { name: category.name, type: category.type, color: category.color, icon: category.icon } : { type: 'expense', color: '#6b7280' },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (category) {
      await db.categories.update(category.id, { ...data, updatedAt: ts } as any);
    } else {
      await db.categories.add({ ...data as any, id: generateId(), parentId, isSystem: false, sortOrder: 0, createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Name" error={errors.name?.message} {...register('name')} />
      <Select label="Type" options={[{value:'income',label:'Income'},{value:'expense',label:'Expense'},{value:'savings',label:'Savings'},{value:'transfer',label:'Transfer'}]} {...register('type')} />
      <div className="flex gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">Colour</label>
          <input type="color" {...register('color')} className="h-10 w-10 rounded cursor-pointer border border-border" />
        </div>
        <Input label="Icon (lucide name)" {...register('icon')} placeholder="e.g. ShoppingCart" className="flex-1" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{category ? 'Save' : 'Add Category'}</Button>
      </div>
    </form>
  );
}

export default function Categories() {
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addParentId, setAddParentId] = useState<string | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const topLevel = categories?.filter(c => !c.parentId) ?? [];

  return (
    <PageLayout actions={<Button onClick={() => { setAddParentId(undefined); setShowAdd(true); }} size="sm"><Plus size={14} className="mr-1" />Add Category</Button>}>
      {!categories ? <Skeleton className="h-64" />
        : topLevel.length === 0 ? <EmptyState title="No categories" description="Add spending categories." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add</Button>} />
        : (
          <div className="space-y-2">
            {topLevel.map(cat => {
              const children = categories.filter(c => c.parentId === cat.id);
              return (
                <Card key={cat.id} padded={false} className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: cat.color || '#6b7280' }} />
                      <p className="text-sm font-semibold text-text-primary">{cat.name}</p>
                      <Badge variant="default" className="text-xs">{cat.type}</Badge>
                      {cat.isSystem && <Badge variant="default" className="text-xs">System</Badge>}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setAddParentId(cat.id); setShowAdd(true); }} title="Add sub-category"><Plus size={12} /></Button>
                      {!cat.isSystem && <Button variant="ghost" size="sm" onClick={() => setEditCat(cat)}><Edit2 size={13} /></Button>}
                      {!cat.isSystem && <Button variant="ghost" size="sm" onClick={() => setDeleteId(cat.id)}><Trash2 size={13} /></Button>}
                    </div>
                  </div>
                  {children.length > 0 && (
                    <div className="border-t border-border divide-y divide-border">
                      {children.map(child => (
                        <div key={child.id} className="flex items-center justify-between px-4 pl-8 py-2">
                          <div className="flex items-center gap-2">
                            <ChevronRight size={12} className="text-text-tertiary" />
                            <div className="w-2 h-2 rounded-full" style={{ background: child.color || '#9ca3af' }} />
                            <p className="text-sm text-text-secondary">{child.name}</p>
                          </div>
                          <div className="flex gap-1">
                            {!child.isSystem && <Button variant="ghost" size="sm" onClick={() => setEditCat(child)}><Edit2 size={12} /></Button>}
                            {!child.isSystem && <Button variant="ghost" size="sm" onClick={() => setDeleteId(child.id)}><Trash2 size={12} /></Button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddParentId(undefined); }} title={addParentId ? 'Add Sub-Category' : 'Add Category'}>
        <CategoryForm parentId={addParentId} onClose={() => { setShowAdd(false); setAddParentId(undefined); }} />
      </Modal>
      <Modal open={!!editCat} onClose={() => setEditCat(null)} title="Edit Category">
        {editCat && <CategoryForm category={editCat} onClose={() => setEditCat(null)} />}
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.categories.delete(deleteId); setDeleteId(null); } }} title="Delete Category" message="This will permanently remove this category." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
