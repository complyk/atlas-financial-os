import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus } from 'lucide-react';
import { db, type Account, type AccountType } from '../../db/schema';
import { Card, CardHeader, CardTitle, Skeleton, Button, Modal, Input, Select, NumberInput, EditableCurrency } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';
import { generateId } from '../../lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Pension accounts may carry an optional monthly contribution override stored as runtime field.
type PensionAccount = Account & { monthlyContribution?: number };

function projectPension(currentValue: number, monthlyContrib: number, annualReturn: number, years: number): number {
  const monthly = annualReturn / 12;
  let val = currentValue;
  for (let i = 0; i < years * 12; i++) {
    val = val * (1 + monthly) + monthlyContrib;
  }
  return val;
}

const pensionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['pension_dc', 'pension_db']),
  provider: z.string().optional(),
  balance: z.number().min(0),
  personId: z.string().optional(),
  monthlyContribution: z.number().min(0).optional(),
});
type PensionFormData = z.infer<typeof pensionSchema>;

function AddPensionForm({ onClose }: { onClose: () => void }) {
  const { currency } = useAppStore();
  const people = useLiveQuery(() => db.people.toArray(), []);
  const { register, handleSubmit, control, formState: { errors } } = useForm<PensionFormData>({
    resolver: zodResolver(pensionSchema),
    defaultValues: { type: 'pension_dc', balance: 0, monthlyContribution: 0 },
  });
  const onSubmit = async (data: PensionFormData) => {
    const ts = new Date().toISOString();
    const accounts = await db.accounts.toArray();
    const sortOrder = accounts.length;
    await db.accounts.add({
      id: generateId(),
      name: data.name,
      type: data.type as AccountType,
      provider: data.provider,
      balance: data.balance,
      currency,
      isActive: true,
      includeInNetWorth: true,
      personId: data.personId || undefined,
      sortOrder,
      monthlyContribution: data.monthlyContribution,
      createdAt: ts,
      updatedAt: ts,
    } as Account & { monthlyContribution?: number });
    onClose();
  };
  const personOptions = [
    { value: '', label: 'No owner' },
    ...(people ?? []).map(p => ({ value: p.id, label: p.name })),
  ];
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Account Name" error={errors.name?.message} {...register('name')} placeholder="e.g. Workplace Pension" />
      <Select label="Type" options={[{ value: 'pension_dc', label: 'Defined Contribution (DC)' }, { value: 'pension_db', label: 'Defined Benefit (DB)' }]} {...register('type')} />
      <Input label="Provider" {...register('provider')} placeholder="e.g. Vanguard" />
      <Controller name="balance" control={control} render={({ field }) => <NumberInput label="Current Balance" prefix={currency} value={field.value} onChange={field.onChange} step={1000} />} />
      <Controller name="monthlyContribution" control={control} render={({ field }) => <NumberInput label="Monthly Contribution (optional override)" prefix={currency} value={field.value || 0} onChange={field.onChange} step={100} />} />
      <Select label="Owner" options={personOptions} {...register('personId')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">Add Pension</Button>
      </div>
    </form>
  );
}

export default function Pensions() {
  const { currency, locale } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const data = useLiveQuery(async () => {
    const [accounts, settings, people] = await Promise.all([
      db.accounts.filter(a => a.isActive && (a.type === 'pension_dc' || a.type === 'pension_db')).toArray() as unknown as Promise<PensionAccount[]>,
      db.settings.get('singleton'),
      db.people.toArray(),
    ]);
    const peopleMap = Object.fromEntries(people.map(p => [p.id, p]));
    return { accounts, settings, peopleMap };
  }, []);

  if (!data) return <PageLayout><Skeleton className="h-64" /></PageLayout>;
  const { accounts, settings, peopleMap } = data;
  const totalPension = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Pension Account</Button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Total Pension Value</p>
          <p className="font-mono text-2xl font-bold text-text-primary">{formatCurrency(totalPension, currency, locale, true)}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-tertiary mb-1">Target Retirement Age</p>
          <p className="font-mono text-2xl font-bold text-text-primary">{settings?.projection.retirementAgePrimary ?? 60}</p>
        </Card>
      </div>

      {accounts.map(acc => {
        const person = acc.personId ? peopleMap[acc.personId] : null;
        const isPrimary = person ? person.id === settings?.primaryPersonId : true;
        const retAge = (person?.retirementAge) ?? (isPrimary ? settings?.projection.retirementAgePrimary : settings?.projection.retirementAgeSecondary) ?? 60;
        const dob = person?.dateOfBirth;
        const currentAge = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000)) : 35;
        const yearsToRetire = Math.max(0, retAge - currentAge);
        const personIncome = isPrimary ? (settings?.primaryIncome ?? 0) : (settings?.secondaryIncome ?? 0);
        const computedContrib = settings ? personIncome * settings.projection.pensionContributionRate / 12 : 0;
        const hasOverride = acc.monthlyContribution !== undefined && acc.monthlyContribution > 0;
        const monthlyContrib = hasOverride ? (acc.monthlyContribution as number) : computedContrib;

        return (
          <Card key={acc.id} className="mb-4">
            <CardHeader>
              <CardTitle>{acc.name}</CardTitle>
              <span className="text-xs text-text-tertiary">{acc.provider}{person ? ` · ${person.name}` : ''}</span>
            </CardHeader>
            <div className="flex items-end gap-6 flex-wrap mb-4">
              <div>
                <p className="text-xs text-text-tertiary mb-1">Current balance</p>
                <EditableCurrency
                  value={acc.balance}
                  currency={acc.currency || currency}
                  size="lg"
                  align="left"
                  compact
                  ariaLabel={`Edit balance for ${acc.name}`}
                  onSave={async (v) => {
                    await db.accounts.update(acc.id, { balance: v, updatedAt: new Date().toISOString() } as Partial<Account>);
                  }}
                />
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Monthly contribution</p>
                <EditableCurrency
                  value={monthlyContrib}
                  currency={acc.currency || currency}
                  size="sm"
                  align="left"
                  ariaLabel={`Edit monthly contribution for ${acc.name}`}
                  onSave={async (v) => {
                    await db.accounts.update(acc.id, { monthlyContribution: v, updatedAt: new Date().toISOString() } as Partial<Account> & { monthlyContribution: number });
                  }}
                />
                {!hasOverride && (
                  <p className="text-xs text-text-tertiary mt-0.5">Derived from settings</p>
                )}
              </div>
              <div>
                <p className="text-xs text-text-tertiary mb-1">Years to retirement</p>
                <p className="font-mono text-base font-semibold text-text-primary">{yearsToRetire}y</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[3, 5, 7].map(rate => {
                const projected = projectPension(acc.balance, monthlyContrib, rate / 100, yearsToRetire);
                return (
                  <div key={rate} className="bg-surface-raised rounded-xl p-3 text-center">
                    <p className="text-xs text-text-tertiary mb-1">{rate}% return</p>
                    <p className="font-mono text-sm font-bold text-text-primary">{formatCurrency(projected, currency, locale, true)}</p>
                    <p className="text-xs text-text-tertiary">in {yearsToRetire}y</p>
                  </div>
                );
              })}
            </div>
            {acc.interestRate && <p className="mt-3 text-xs text-text-tertiary">Current rate: {(acc.interestRate * 100).toFixed(2)}% p.a.</p>}
          </Card>
        );
      })}

      {accounts.length === 0 && (
        <Card>
          <p className="text-sm text-text-secondary text-center py-8">
            No pension accounts found.{' '}
            <button className="text-accent underline" onClick={() => setShowAdd(true)}>Add a Pension DC or DB account</button> to get started.
          </p>
        </Card>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Pension Account">
        <AddPensionForm onClose={() => setShowAdd(false)} />
      </Modal>
    </PageLayout>
  );
}
