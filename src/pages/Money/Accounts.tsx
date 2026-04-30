import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { db, type Account, type AccountType } from '../../db/schema';
import { Card, Badge, Button, Modal, Input, Select, Toggle, NumberInput, EmptyState, Skeleton, ConfirmDialog } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  current: 'Current', savings: 'Savings', isa_cash: 'ISA Cash', isa_stocks: 'ISA Stocks',
  investment: 'Investment', pension_dc: 'Pension DC', pension_db: 'Pension DB',
  mortgage: 'Mortgage', loan: 'Loan', credit_card: 'Credit Card',
  cash: 'Cash', crypto: 'Crypto', other: 'Other',
};

const ACCOUNT_GROUPS: { label: string; types: AccountType[] }[] = [
  { label: 'Cash & Savings', types: ['current', 'savings', 'cash'] },
  { label: 'Investments & Pensions', types: ['isa_cash', 'isa_stocks', 'investment', 'pension_dc', 'pension_db'] },
  { label: 'Crypto', types: ['crypto'] },
  { label: 'Debt', types: ['mortgage', 'loan', 'credit_card'] },
  { label: 'Other', types: ['other'] },
];

const schema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.string(),
  provider: z.string().min(1, 'Provider required'),
  currency: z.string().default('AED'),
  balance: z.number().min(0),
  interestRate: z.number().optional(),
  includeInNetWorth: z.boolean().default(true),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function AccountCard({ account, onEdit, onDelete }: { account: Account; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center text-accent font-bold text-sm flex-shrink-0">
          {(account.provider || account.name).slice(0, 2).toUpperCase()}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit account"><Edit2 size={13} /></Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label="Delete account"><Trash2 size={13} /></Button>
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">{account.name}</p>
        <p className="text-xs text-text-tertiary">{account.provider}</p>
      </div>
      <div className="flex items-end justify-between">
        <p className="font-mono text-xl font-bold text-text-primary tabular-nums">{formatCurrency(account.balance, account.currency || 'AED', 'en-AE', true)}</p>
        <Badge variant="default">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
      </div>
      {account.interestRate && <p className="text-xs text-text-tertiary">{(account.interestRate * 100).toFixed(2)}% p.a.</p>}
    </Card>
  );
}

function AccountForm({ account, onClose }: { account?: Account; onClose: () => void }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: account ? { ...account } : { currency: 'AED', includeInNetWorth: true, balance: 0, type: 'current' },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (account) {
      await db.accounts.update(account.id, { ...data, updatedAt: ts } as any);
    } else {
      await db.accounts.add({ ...data as any, id: generateId(), isActive: true, sortOrder: 0, createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  const typeOptions = Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Account Name" error={errors.name?.message} {...register('name')} placeholder="e.g. Emirates NBD Current" />
      <Input label="Provider / Institution" error={errors.provider?.message} {...register('provider')} placeholder="e.g. Emirates NBD" />
      <Select label="Account Type" options={typeOptions} {...register('type')} />
      <Controller name="balance" control={control} render={({ field }) => (
        <NumberInput label="Current Balance" prefix="AED" value={field.value} onChange={field.onChange} step={100} />
      )} />
      <Controller name="interestRate" control={control} render={({ field }) => (
        <NumberInput label="Interest Rate (optional)" suffix="%" value={field.value !== undefined ? field.value * 100 : ''} onChange={v => field.onChange(v / 100)} step={0.1} />
      )} />
      <Controller name="includeInNetWorth" control={control} render={({ field }) => (
        <Toggle checked={field.value} onChange={field.onChange} label="Include in Net Worth" />
      )} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{account ? 'Save Changes' : 'Add Account'}</Button>
      </div>
    </form>
  );
}

export default function Accounts() {
  const accounts = useLiveQuery(() => db.accounts.filter(a => a.isActive).toArray(), []);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) { await db.accounts.update(deleteId, { isActive: false }); setDeleteId(null); }
  };

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" /> Add Account</Button>}>
      {!accounts ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState title="No accounts yet" description="Add your bank accounts, investments, and pensions to get started." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} className="mr-1" /> Add Account</Button>} />
      ) : (
        ACCOUNT_GROUPS.map(group => {
          const groupAccounts = accounts.filter(a => group.types.includes(a.type));
          if (!groupAccounts.length) return null;
          return (
            <div key={group.label} className="mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-3">{group.label}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {groupAccounts.map(acc => (
                  <AccountCard key={acc.id} account={acc} onEdit={() => setEditAccount(acc)} onDelete={() => setDeleteId(acc.id)} />
                ))}
              </div>
            </div>
          );
        })
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Account">
        <AccountForm onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editAccount} onClose={() => setEditAccount(null)} title="Edit Account">
        {editAccount && <AccountForm account={editAccount} onClose={() => setEditAccount(null)} />}
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Remove Account" message="This will hide the account from your dashboard. All transaction history is preserved." confirmLabel="Remove" destructive />
    </PageLayout>
  );
}
