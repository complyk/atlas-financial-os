import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Search, Upload } from 'lucide-react';
import { db, type TransactionType } from '../../db/schema';
import { Card, Button, Select, Badge, Modal, EmptyState, Skeleton } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { ImportWizard } from '../../components/import/ImportWizard';
import { formatCurrency, formatDate } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const txSchema = z.object({
  date: z.string(),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer', 'investment']),
  accountId: z.string(),
  categoryId: z.string().default(''),
  notes: z.string().optional(),
});
type TxForm = z.infer<typeof txSchema>;

function TxFormComponent({ onClose }: { onClose: () => void }) {
  const accounts = useLiveQuery(() => db.accounts.filter(a => a.isActive).toArray(), []);
  const categories = useLiveQuery(() => db.categories.toArray(), []);
  const { register, handleSubmit, control, formState: { errors } } = useForm<TxForm>({
    resolver: zodResolver(txSchema),
    defaultValues: { date: new Date().toISOString().slice(0, 10), type: 'expense', categoryId: '' },
  });
  const onSubmit = async (data: TxForm) => {
    const ts = new Date().toISOString();
    await db.transactions.add({ ...data, id: generateId(), isReviewed: false, tags: [], createdAt: ts, updatedAt: ts } as any);
    onClose();
  };
  const acctOptions = (accounts ?? []).map(a => ({ value: a.id, label: a.name }));
  const catOptions = (categories ?? []).map(c => ({ value: c.id, label: c.name }));
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Date</label>
        <input type="date" {...register('date')} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised focus:outline-none focus:border-accent" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Description</label>
        <input {...register('description')} placeholder="e.g. Noon Food Order" className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised focus:outline-none focus:border-accent" />
        {errors.description && <p className="text-xs text-negative">{errors.description.message}</p>}
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Amount (AED)</label>
        <Controller name="amount" control={control} render={({ field }) => (
          <input type="number" step="0.01" value={field.value || ''} onChange={e => field.onChange(Number(e.target.value))} placeholder="0.00" className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
        )} />
        {errors.amount && <p className="text-xs text-negative">{errors.amount.message}</p>}
      </div>
      <Select label="Type" options={[{value:'income',label:'Income'},{value:'expense',label:'Expense'},{value:'transfer',label:'Transfer'},{value:'investment',label:'Investment'}]} {...register('type')} />
      {acctOptions.length > 0 && <Select label="Account" options={acctOptions} {...register('accountId')} />}
      {catOptions.length > 0 && <Select label="Category" options={[{value:'',label:'— No category —'}, ...catOptions]} {...register('categoryId')} />}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-text-secondary">Notes (optional)</label>
        <input {...register('notes')} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised focus:outline-none focus:border-accent" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">Add Transaction</Button>
      </div>
    </form>
  );
}

export default function Transactions() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const allData = useLiveQuery(async () => {
    const [transactions, accounts, categories] = await Promise.all([
      db.transactions.orderBy('date').reverse().limit(500).toArray(),
      db.accounts.toArray(),
      db.categories.toArray(),
    ]);
    const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
    return { transactions, accMap, catMap };
  }, []);

  const filtered = useMemo(() => {
    if (!allData) return [];
    return allData.transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.description.toLowerCase().includes(q) || (t.categoryId && allData.catMap[t.categoryId]?.name.toLowerCase().includes(q));
      }
      return true;
    });
  }, [allData, search, typeFilter]);

  return (
    <PageLayout actions={
      <div className="flex gap-2">
        <Button onClick={() => setShowImport(true)} size="sm" variant="secondary"><Upload size={14} className="mr-1" /> Import CSV</Button>
        <Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" /> Add</Button>
      </div>
    }>
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-surface-raised focus:outline-none focus:border-accent" />
        </div>
        <Select
          options={[{value:'all',label:'All types'},{value:'income',label:'Income'},{value:'expense',label:'Expenses'},{value:'transfer',label:'Transfers'}]}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as any)}
        />
      </div>

      {!allData ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState title="No transactions found" description="Add a transaction or adjust your filters." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1" /> Add Transaction</Button>} />
      ) : (
        <Card padded={false}>
          <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
            {filtered.map((tx, i) => {
              const cat = tx.categoryId ? allData.catMap[tx.categoryId] : null;
              const acc = allData.accMap[tx.accountId];
              const isIncome = tx.type === 'income';
              return (
                <div key={tx.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-surface-raised transition-colors ${i > 0 ? 'border-t border-border' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: cat?.color ? cat.color + '20' : 'var(--color-surface-raised)', color: cat?.color || 'var(--color-text-tertiary)' }}>
                    {cat?.icon || tx.description.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{tx.description}</p>
                    <p className="text-xs text-text-tertiary">{formatDate(tx.date, 'dd MMM')} · {acc?.name || '—'}</p>
                  </div>
                  {cat && <Badge variant="default" className="hidden md:inline-flex text-xs">{cat.name}</Badge>}
                  <span className={`font-mono text-sm font-semibold flex-shrink-0 ${isIncome ? 'text-positive' : 'text-text-primary'}`}>
                    {isIncome ? '+' : ''}{formatCurrency(tx.amount, acc?.currency || 'AED', 'en-AE', true)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction">
        <TxFormComponent onClose={() => setShowAdd(false)} />
      </Modal>
      <ImportWizard open={showImport} onClose={() => setShowImport(false)} />
    </PageLayout>
  );
}
