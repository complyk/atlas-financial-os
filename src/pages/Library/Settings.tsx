import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useRef, useState } from 'react';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Button, Input, Select, Skeleton } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { useAppStore } from '../../stores/useAppStore';
import { syncWorkbook, type XLSXSyncReport } from '../../lib/xlsxImport';
import { formatCurrency } from '../../lib/format';

export default function Settings() {
  const { theme, setTheme, density, setDensity, setCurrency, setLocale } = useAppStore();
  const settings = useLiveQuery(() => db.settings.get('singleton'), []);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const [xlsxBusy, setXlsxBusy] = useState(false);
  const [xlsxReport, setXlsxReport] = useState<XLSXSyncReport | null>(null);
  const [xlsxError, setXlsxError] = useState<string | null>(null);

  useEffect(() => {
    if (settings && !form) setForm({ ...settings });
  }, [settings, form]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    await db.settings.put(form);
    // Keep the global store in sync so other pages re-render with new currency/locale.
    if (form.currency) setCurrency(form.currency);
    if (form.locale) setLocale(form.locale);
    if (form.theme) setTheme(form.theme);
    if (form.density) setDensity(form.density);
    setSaving(false);
  };

  const handleWorkbookFile = async (file: File) => {
    setXlsxError(null);
    setXlsxReport(null);
    setXlsxBusy(true);
    try {
      const report = await syncWorkbook(file);
      setXlsxReport(report);
    } catch (err) {
      console.error(err);
      setXlsxError('Could not read the workbook. Make sure it has Monthly Reviews and Budget tabs.');
    } finally {
      setXlsxBusy(false);
      if (xlsxInputRef.current) xlsxInputRef.current.value = '';
    }
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
              <Select label="Locale" value={form.locale || 'en-AE'} onChange={e => setForm({ ...form, locale: e.target.value })} options={[{value:'en-AE',label:'English (UAE)'},{value:'en-GB',label:'English (UK)'},{value:'en-US',label:'English (US)'},{value:'en-IE',label:'English (Ireland)'}]} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Theme" value={theme} onChange={e => setTheme(e.target.value as any)} options={[{value:'system',label:'System'},{value:'light',label:'Light'},{value:'dark',label:'Dark'}]} />
              <Select label="Density" value={density} onChange={e => setDensity(e.target.value as any)} options={[{value:'comfortable',label:'Comfortable'},{value:'compact',label:'Compact'}]} />
            </div>
          </div>
        </Card>

        {/* Income */}
        <Card>
          <CardHeader><CardTitle>Income</CardTitle></CardHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">Primary Income ({form.currency || 'AED'}/mo)</label>
                <input type="number" value={form.primaryIncome} onChange={e => setForm({ ...form, primaryIncome: Number(e.target.value) })} className="px-3 py-2 text-sm rounded-lg border border-border bg-surface-raised font-mono focus:outline-none focus:border-accent" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-secondary">Secondary Income ({form.currency || 'AED'}/mo)</label>
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

        {/* Sync from spreadsheet */}
        <Card>
          <CardHeader><CardTitle>Sync from spreadsheet</CardTitle></CardHeader>
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Drop in your monthly budget workbook to refresh net-worth history, comments and the retirement target. The workbook should have a <span className="font-medium text-text-primary">Monthly Reviews</span> tab (with Savings Syl, Savings Kayne, Total, CC, Comment rows) and a <span className="font-medium text-text-primary">Budget</span> tab. A <span className="font-medium text-text-primary">Retirement</span> tab is optional and refreshes the retirement goal target.
            </p>
            <div className="flex items-center gap-3">
              <input
                ref={xlsxInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleWorkbookFile(f);
                }}
              />
              <Button
                onClick={() => xlsxInputRef.current?.click()}
                disabled={xlsxBusy}
                loading={xlsxBusy}
              >
                Choose XLSX...
              </Button>
              {xlsxBusy && (
                <span className="text-xs text-text-tertiary">Reading workbook…</span>
              )}
            </div>

            {xlsxError && (
              <div className="text-sm text-negative bg-negative/10 rounded-lg px-3 py-2">
                {xlsxError}
              </div>
            )}

            {xlsxReport && (
              <div className="rounded-lg border border-border bg-surface-raised px-3 py-3 space-y-2">
                <p className="text-sm font-medium text-text-primary">
                  {xlsxReport.monthsAdded === 0 && xlsxReport.monthsUpdated === 0
                    ? 'No new data found.'
                    : `Synced ${xlsxReport.monthsAdded} new month${xlsxReport.monthsAdded === 1 ? '' : 's'} · ${xlsxReport.monthsUpdated} updated`}
                </p>
                {xlsxReport.retirementTargetAED && (
                  <p className="text-xs text-text-tertiary">
                    Retirement target updated to {formatCurrency(xlsxReport.retirementTargetAED, form.currency || 'AED')}
                  </p>
                )}
                {xlsxReport.notes.length > 0 && (
                  <ul className="text-xs text-text-secondary space-y-1 max-h-40 overflow-y-auto pt-1">
                    {xlsxReport.notes.map((n, i) => (
                      <li key={i} className="font-mono">{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
