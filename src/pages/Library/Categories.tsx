import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, ChevronRight, Lock, Archive, RotateCcw, ChevronDown } from 'lucide-react';
import { db, type Category, type CategoryType } from '../../db/schema';
import { Card, Button, Modal, Input, Select, EmptyState, Skeleton, ConfirmDialog, Badge } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { generateId } from '../../lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string(),
  parentId: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

interface CategoryFormProps {
  category?: Category;
  parentId?: string;
  topLevel: Category[];
  onClose: () => void;
}

function CategoryForm({ category, parentId, topLevel, onClose }: CategoryFormProps) {
  const isSystem = category?.isSystem ?? false;
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: category
      ? { name: category.name, type: category.type, parentId: category.parentId ?? '', color: category.color, icon: category.icon }
      : { type: 'expense', parentId: parentId ?? '', color: '#6b7280', icon: '' },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (category) {
      // System categories: only icon/color editable.
      if (isSystem) {
        await db.categories.update(category.id, {
          color: data.color,
          icon: data.icon,
          updatedAt: ts,
        });
      } else {
        await db.categories.update(category.id, {
          name: data.name,
          type: data.type as CategoryType,
          parentId: data.parentId || undefined,
          color: data.color,
          icon: data.icon,
          updatedAt: ts,
        });
      }
    } else {
      await db.categories.add({
        id: generateId(),
        name: data.name,
        type: data.type as CategoryType,
        parentId: data.parentId || undefined,
        color: data.color,
        icon: data.icon,
        isSystem: false,
        sortOrder: 0,
        createdAt: ts,
        updatedAt: ts,
      });
    }
    onClose();
  };

  const parentOptions = [
    { value: '', label: '— None (top-level) —' },
    ...topLevel
      .filter(c => !category || c.id !== category.id)
      .map(c => ({ value: c.id, label: c.name })),
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isSystem && (
        <div className="text-xs text-text-tertiary bg-surface-raised rounded-lg px-3 py-2 inline-flex items-center gap-2">
          <Lock size={12} /> System category — only icon and colour can be changed.
        </div>
      )}
      <Input label="Name" disabled={isSystem} error={errors.name?.message} {...register('name')} />
      <Select
        label="Type"
        disabled={isSystem}
        options={[
          { value: 'income', label: 'Income' },
          { value: 'expense', label: 'Expense' },
          { value: 'savings', label: 'Savings' },
          { value: 'transfer', label: 'Transfer' },
        ]}
        {...register('type')}
      />
      <Select
        label="Parent"
        disabled={isSystem}
        options={parentOptions}
        {...register('parentId')}
      />
      <div className="flex gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">Colour</label>
          <input type="color" {...register('color')} className="h-10 w-10 rounded cursor-pointer border border-border" aria-label="Category colour" />
        </div>
        <Input label="Icon (emoji)" {...register('icon')} placeholder="e.g. 🛒" className="flex-1" />
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
  const [archivedOpen, setArchivedOpen] = useState(false);

  const isArchived = (c: Category) => Boolean((c as Category & { isArchived?: boolean }).isArchived);

  const archive = async (id: string) => {
    await db.categories.update(id, {
      ...({ isArchived: true } as object),
      updatedAt: new Date().toISOString(),
    } as Partial<Category>);
  };
  const restore = async (id: string) => {
    await db.categories.update(id, {
      ...({ isArchived: false } as object),
      updatedAt: new Date().toISOString(),
    } as Partial<Category>);
  };

  const allActive = (categories ?? []).filter(c => !isArchived(c));
  const archived = (categories ?? []).filter(isArchived);
  const topLevel = allActive.filter(c => !c.parentId);
  const topLevelAll = (categories ?? []).filter(c => !c.parentId);

  return (
    <PageLayout actions={<Button onClick={() => { setAddParentId(undefined); setShowAdd(true); }} size="sm" aria-label="Add category"><Plus size={14} className="mr-1" />Add Category</Button>}>
      {!categories ? <Skeleton className="h-64" />
        : topLevel.length === 0 && archived.length === 0 ? <EmptyState title="No categories" description="Add spending categories." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add</Button>} />
        : (
          <div className="space-y-2">
            {topLevel.map(cat => {
              const children = allActive.filter(c => c.parentId === cat.id);
              return (
                <Card key={cat.id} padded={false} className="overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ background: cat.color || '#6b7280' }} />
                      {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                      <p className="text-sm font-semibold text-text-primary">{cat.name}</p>
                      <Badge variant="default" className="text-xs">{cat.type}</Badge>
                      {cat.isSystem && (
                        <Badge variant="default" className="text-xs inline-flex items-center gap-1">
                          <Lock size={10} /> System
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" aria-label={`Add sub-category under ${cat.name}`} onClick={() => { setAddParentId(cat.id); setShowAdd(true); }} title="Add sub-category"><Plus size={12} /></Button>
                      <Button variant="ghost" size="sm" aria-label={`Edit ${cat.name}`} onClick={() => setEditCat(cat)}><Edit2 size={13} /></Button>
                      {!cat.isSystem && (
                        <Button variant="ghost" size="sm" aria-label={`Archive ${cat.name}`} onClick={() => archive(cat.id)} title="Archive"><Archive size={13} /></Button>
                      )}
                      {!cat.isSystem && (
                        <Button variant="ghost" size="sm" aria-label={`Delete ${cat.name}`} onClick={() => setDeleteId(cat.id)}><Trash2 size={13} /></Button>
                      )}
                    </div>
                  </div>
                  {children.length > 0 && (
                    <div className="border-t border-border divide-y divide-border">
                      {children.map(child => (
                        <div key={child.id} className="flex items-center justify-between px-4 pl-8 py-2">
                          <div className="flex items-center gap-2">
                            <ChevronRight size={12} className="text-text-tertiary" />
                            <div className="w-2 h-2 rounded-full" style={{ background: child.color || '#9ca3af' }} />
                            {child.icon && <span className="text-sm leading-none">{child.icon}</span>}
                            <p className="text-sm text-text-secondary">{child.name}</p>
                            {child.isSystem && (
                              <Badge variant="default" className="text-xs inline-flex items-center gap-1">
                                <Lock size={10} />
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" aria-label={`Edit ${child.name}`} onClick={() => setEditCat(child)}><Edit2 size={12} /></Button>
                            {!child.isSystem && (
                              <Button variant="ghost" size="sm" aria-label={`Archive ${child.name}`} onClick={() => archive(child.id)} title="Archive"><Archive size={12} /></Button>
                            )}
                            {!child.isSystem && (
                              <Button variant="ghost" size="sm" aria-label={`Delete ${child.name}`} onClick={() => setDeleteId(child.id)}><Trash2 size={12} /></Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}

            {archived.length > 0 && (
              <Card padded={false} className="overflow-hidden mt-4">
                <button
                  type="button"
                  onClick={() => setArchivedOpen(o => !o)}
                  aria-expanded={archivedOpen}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-raised/50 transition-colors"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary">
                    <Archive size={13} />
                    Archived ({archived.length})
                  </span>
                  {archivedOpen ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronRight size={14} className="text-text-tertiary" />}
                </button>
                {archivedOpen && (
                  <div className="border-t border-border divide-y divide-border">
                    {archived.map(cat => (
                      <div key={cat.id} className="flex items-center justify-between px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full opacity-50" style={{ background: cat.color || '#6b7280' }} />
                          {cat.icon && <span className="text-sm leading-none opacity-60">{cat.icon}</span>}
                          <p className="text-sm text-text-tertiary">{cat.name}</p>
                          <Badge variant="default" className="text-xs">{cat.type}</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" aria-label={`Restore ${cat.name}`} onClick={() => restore(cat.id)} title="Restore">
                            <RotateCcw size={13} />
                          </Button>
                          <Button variant="ghost" size="sm" aria-label={`Delete ${cat.name}`} onClick={() => setDeleteId(cat.id)}><Trash2 size={13} /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setAddParentId(undefined); }} title={addParentId ? 'Add Sub-Category' : 'Add Category'}>
        <CategoryForm parentId={addParentId} topLevel={topLevelAll} onClose={() => { setShowAdd(false); setAddParentId(undefined); }} />
      </Modal>
      <Modal open={!!editCat} onClose={() => setEditCat(null)} title="Edit Category">
        {editCat && <CategoryForm category={editCat} topLevel={topLevelAll} onClose={() => setEditCat(null)} />}
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.categories.delete(deleteId); setDeleteId(null); } }} title="Delete Category" message="This will permanently remove this category." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
