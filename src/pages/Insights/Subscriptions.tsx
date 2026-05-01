import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, Edit2, Trash2, XCircle } from 'lucide-react';
import { db, type Frequency, type RecurringRule } from '../../db/schema';
import { Card, CardHeader, CardTitle, Skeleton, EmptyState, Button, Modal, Input, Select, ConfirmDialog, Badge } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { subDays } from 'date-fns';

function monthlyAmount(rule: { amount: number; frequency: Frequency }): number {
  switch (rule.frequency) {
    case 'weekly': return (rule.amount * 52) / 12;
    case 'fortnightly': return (rule.amount * 26) / 12;
    case 'monthly': return rule.amount;
    case 'quarterly': return rule.amount / 3;
    case 'semi_annual': return rule.amount / 6;
    case 'annual': return rule.amount / 12;
    default: return rule.amount;
  }
}

const annualAmount = (rule: { amount: number; frequency: Frequency }) => monthlyAmount(rule) * 12;

const SUBSCRIPTION_KEYWORDS = [
  'netflix', 'spotify', 'apple', 'disney', 'amazon prime', 'prime video', 'hulu',
  'youtube', 'icloud', 'google', 'microsoft', 'office 365', 'adobe', 'dropbox',
  'notion', 'figma', 'github', 'audible', 'kindle', 'shahid', 'starz', 'anghami',
  'paramount', 'hbo', 'tidal', 'deezer', 'canva', 'chatgpt', 'openai',
];

function isSubscriptionLike(rule: RecurringRule, categoryName?: string): boolean {
  const haystack = `${rule.name} ${rule.description ?? ''} ${categoryName ?? ''}`.toLowerCase();
  return SUBSCRIPTION_KEYWORDS.some(kw => haystack.includes(kw));
}

const editSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  amount: z.number().positive('Must be positive'),
  frequency: z.string(),
  accountId: z.string().min(1, 'Account is required'),
  categoryId: z.string().optional(),
});
type EditFormData = z.infer<typeof editSchema>;

function EditSubscriptionForm({ rule, accounts, categories, onClose }: {
  rule: RecurringRule;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: rule.name,
      amount: rule.amount,
      frequency: rule.frequency,
      accountId: rule.accountId,
      categoryId: rule.categoryId ?? '',
    },
  });
  const onSubmit = async (data: EditFormData) => {
    await db.recurringRules.update(rule.id, {
      name: data.name,
      amount: data.amount,
      frequency: data.frequency as Frequency,
      accountId: data.accountId,
      categoryId: data.categoryId || undefined,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Name" error={errors.name?.message} {...register('name')} />
      <Input label="Amount" type="number" step="0.01" error={errors.amount?.message} {...register('amount', { valueAsNumber: true })} />
      <Select label="Frequency" options={[
        { value: 'weekly', label: 'Weekly' },
        { value: 'fortnightly', label: 'Fortnightly' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'semi_annual', label: 'Semi-annual' },
        { value: 'annual', label: 'Annual' },
      ]} {...register('frequency')} />
      <Select label="Account" options={accounts.map(a => ({ value: a.id, label: a.name }))} error={errors.accountId?.message} {...register('accountId')} />
      <Select label="Category" options={[{ value: '', label: '— None —' }, ...categories.map(c => ({ value: c.id, label: c.name }))]} {...register('categoryId')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

export default function Subscriptions() {
  const { currency, locale } = useAppStore();
  const [editRule, setEditRule] = useState<RecurringRule | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const data = useLiveQuery(async () => {
    const sixtyDaysAgo = subDays(new Date(), 60).toISOString().slice(0, 10);
    const [rules, categories, accounts, recentTxs] = await Promise.all([
      db.recurringRules.filter(r => r.isActive && r.type === 'expense').toArray(),
      db.categories.toArray(),
      db.accounts.filter(a => a.isActive).toArray(),
      db.transactions.where('date').aboveOrEqual(sixtyDaysAgo).toArray(),
    ]);
    const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

    // Flag possibly unused: subscription-keyword rule with no matching transaction in last 60 days
    const flaggedUnused = new Set<string>();
    for (const rule of rules) {
      const catName = rule.categoryId ? catMap[rule.categoryId]?.name : undefined;
      if (!isSubscriptionLike(rule, catName)) continue;
      const ruleNameLower = rule.name.toLowerCase();
      const matched = recentTxs.some(t => {
        if (t.recurringRuleId === rule.id) return true;
        const desc = (t.description ?? '').toLowerCase();
        const merchant = (t.merchantName ?? '').toLowerCase();
        return desc.includes(ruleNameLower) || merchant.includes(ruleNameLower);
      });
      if (!matched) flaggedUnused.add(rule.id);
    }

    return { subs: rules, catMap, accounts, flaggedUnused, categories };
  }, []);

  const totalMonthly = data?.subs.reduce((s, r) => s + monthlyAmount(r), 0) ?? 0;
  const totalAnnual = data?.subs.reduce((s, r) => s + annualAmount(r), 0) ?? 0;

  const sortedByAnnual = data ? [...data.subs].sort((a, b) => annualAmount(b) - annualAmount(a)) : [];
  const top3 = sortedByAnnual.slice(0, 3);
  const top3Ids = new Set(top3.map(r => r.id));

  return (
    <PageLayout>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Monthly Total</p><p className="font-mono text-xl font-bold text-negative">{formatCurrency(totalMonthly, currency, locale, true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Annual Total</p><p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(totalAnnual, currency, locale, true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Count</p><p className="font-mono text-xl font-bold text-text-primary">{data?.subs.length ?? 0}</p></Card>
      </div>

      {data && data.subs.length > 0 && (
        <Card className="mb-4 border-l-4 border-l-accent">
          <p className="text-sm text-text-secondary">
            You're spending{' '}
            <span className="font-mono font-semibold text-text-primary">{formatCurrency(totalAnnual, currency, locale, true)}/year</span>
            {' '}on subscriptions.
          </p>
          {top3.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-text-tertiary mb-2">Top 3 by annual cost</p>
              <div className="flex flex-wrap gap-2">
                {top3.map(t => (
                  <span key={t.id} className="text-xs bg-surface-raised rounded-lg px-2 py-1">
                    <span className="font-medium text-text-primary">{t.name}</span>
                    <span className="text-text-tertiary"> · </span>
                    <span className="font-mono">{formatCurrency(annualAmount(t), currency, locale, true)}/yr</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {!data ? <Skeleton className="h-64" />
        : data.subs.length === 0 ? <EmptyState title="No recurring expenses" description="Recurring rules will appear here." />
        : (
          <Card>
            <CardHeader><CardTitle>Recurring Expenses</CardTitle></CardHeader>
            <div className="divide-y divide-border">
              {sortedByAnnual.map(sub => {
                const cat = sub.categoryId ? data.catMap[sub.categoryId] : null;
                const monthly = monthlyAmount(sub);
                const annual = annualAmount(sub);
                const isUnused = data.flaggedUnused.has(sub.id);
                const isTop = top3Ids.has(sub.id);
                return (
                  <div key={sub.id} className={`flex items-center justify-between py-3 px-1 ${isTop ? 'bg-accent-light/30 -mx-1 px-2 rounded-md' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: cat?.color ? cat.color + '20' : 'var(--color-surface-raised)', color: cat?.color || 'var(--color-text-tertiary)' }}>
                        {sub.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-text-primary truncate">{sub.name}</p>
                          {isUnused && (
                            <Badge variant="warning" className="text-xs inline-flex items-center gap-1">
                              <AlertTriangle size={10} /> Possibly unused
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-text-tertiary">
                          {formatCurrency(sub.amount, currency, locale, true)} · {sub.frequency} · {cat?.name || 'Uncategorised'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold text-negative">{formatCurrency(monthly, currency, locale, true)}/mo</p>
                        <p className="text-xs text-text-tertiary">{formatCurrency(annual, currency, locale, true)}/yr</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" aria-label={`Edit ${sub.name}`} onClick={() => setEditRule(sub)}><Edit2 size={13} /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Cancel ${sub.name}`} onClick={() => setCancelId(sub.id)}><XCircle size={13} /></Button>
                        <Button variant="ghost" size="sm" aria-label={`Delete ${sub.name}`} onClick={() => setDeleteId(sub.id)}><Trash2 size={13} /></Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

      <Modal open={!!editRule} onClose={() => setEditRule(null)} title="Edit Subscription">
        {editRule && data && (
          <EditSubscriptionForm
            rule={editRule}
            accounts={data.accounts}
            categories={data.categories}
            onClose={() => setEditRule(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!cancelId}
        onClose={() => setCancelId(null)}
        onConfirm={async () => {
          if (cancelId) {
            await db.recurringRules.update(cancelId, { isActive: false, updatedAt: new Date().toISOString() });
            setCancelId(null);
          }
        }}
        title="Cancel Subscription"
        message="This will mark the subscription as inactive but preserve its history. You can reactivate it later."
        confirmLabel="Cancel subscription"
      />

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await db.recurringRules.delete(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete Subscription"
        message="This will permanently remove this recurring rule."
        confirmLabel="Delete"
        destructive
      />
    </PageLayout>
  );
}
