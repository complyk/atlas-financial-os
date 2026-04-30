import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Button, Input, Select, Skeleton } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { useAppStore } from '../../stores/useAppStore';

export default function Settings() {
  const { theme, setTheme, density, setDensity } = useAppStore();
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);

  if (settings && !form) {
    setForm({ ...settings });
  }

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    await db.settings.put(form);
    setSaving(false);
  };

  if (!settings || !form) return <PageLayout><Skeleton className="h-96" /></PageLayout>;

  return (
    <PageLayout actions={<Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>}>
      <div className="max-w-2xl space-y-6">
        {/* General */}
        <Card>
          <CardHeader><CardTitle>General</CardTitle></CardHeader>
          <div className="space-y-4">
            <Input label="Household Name" value={form.householdName} onChange={e => setForm({ ...form, householdName: e.target.value })} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Base Currency" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} options={[{value:'AED',label:'AED — UAE Dirham'},{value:'USD',label:'USD — US Dollar'},{value:'EUR',label:'EUR — Euro'},{value:'GBP',label:'GBP — British Pound'}]} />
              <Select label="Theme" value={theme} onChange={e => setTheme(e.target.value as any)} options={[{value:'system',label:'System'},{value:'light',label:'Light'},{value:'dark',label:'Dark'}]} />
            </div>
            <Select label="Density" value={density} onChange={e => setDensity(e.target.value as any)} options={[{value:'comfortable',label:'Comfortable'},{value:'compact',label:'Compact'}]} />
          </div>
        </Card>

        {/* Income */}
        <Card>
          <CardHeader><CardTitle>Income</CardTitle></CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">Primary Income (AED/mo)</label>
                <input type="number" value={form.primaryIncome} onChange={e => setForm({ ...form, primaryIncome: Number(e.target.value) })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">Secondary Income (AED/mo)</label>
                <input type="number" value={form.secondaryIncome} onChange={e => setForm({ ...form, secondaryIncome: Number(e.target.value) })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
              </div>
            </div>
          </div>
        </Card>

        {/* Projection Settings */}
        <Card>
          <CardHeader><CardTitle>Projection Settings</CardTitle></CardHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Retirement Age (primary)</label>
              <input type="number" value={form.projection.retirementAgePrimary} onChange={e => setForm({ ...form, projection: { ...form.projection, retirementAgePrimary: Number(e.target.value) } })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Life Expectancy</label>
              <input type="number" value={form.projection.lifeExpectancyPrimary} onChange={e => setForm({ ...form, projection: { ...form.projection, lifeExpectancyPrimary: Number(e.target.value) } })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Investment Return (%)</label>
              <input type="number" step="0.1" value={(form.projection.investmentReturnNominalAnnual * 100).toFixed(1)} onChange={e => setForm({ ...form, projection: { ...form.projection, investmentReturnNominalAnnual: Number(e.target.value) / 100 } })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Inflation Rate (%)</label>
              <input type="number" step="0.1" value={(form.projection.inflationRate * 100).toFixed(1)} onChange={e => setForm({ ...form, projection: { ...form.projection, inflationRate: Number(e.target.value) / 100 } })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Safe Withdrawal Rate (%)</label>
              <input type="number" step="0.1" value={(form.projection.safeWithdrawalRate * 100).toFixed(1)} onChange={e => setForm({ ...form, projection: { ...form.projection, safeWithdrawalRate: Number(e.target.value) / 100 } })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-secondary">Income Tax Rate (%)</label>
              <input type="number" step="1" value={(form.projection.effectiveTaxRate * 100).toFixed(0)} onChange={e => setForm({ ...form, projection: { ...form.projection, effectiveTaxRate: Number(e.target.value) / 100 } })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
