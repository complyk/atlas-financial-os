import { useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { db } from '../../db/schema';
import { Card, CardHeader, CardTitle, Button, ConfirmDialog } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';

export default function Export() {
  const [importing, setImporting] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleExport = async () => {
    const [accounts, transactions, categories, recurringRules, assets, liabilities, insurancePolicies, investments, goals, lifeEvents, scenarios, people, settings] = await Promise.all([
      db.accounts.toArray(), db.transactions.toArray(), db.categories.toArray(),
      db.recurringRules.toArray(), db.assets.toArray(), db.liabilities.toArray(),
      db.insurancePolicies.toArray(), db.investments.toArray(), db.goals.toArray(),
      db.lifeEvents.toArray(), db.scenarios.toArray(), db.people.toArray(), db.settings.toArray(),
    ]);
    const data = { exportedAt: new Date().toISOString(), version: 1, accounts, transactions, categories, recurringRules, assets, liabilities, insurancePolicies, investments, goals, lifeEvents, scenarios, people, settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `atlas-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.accounts) await db.accounts.bulkPut(data.accounts);
      if (data.transactions) await db.transactions.bulkPut(data.transactions);
      if (data.categories) await db.categories.bulkPut(data.categories);
      if (data.recurringRules) await db.recurringRules.bulkPut(data.recurringRules);
      if (data.assets) await db.assets.bulkPut(data.assets);
      if (data.liabilities) await db.liabilities.bulkPut(data.liabilities);
      if (data.insurancePolicies) await db.insurancePolicies.bulkPut(data.insurancePolicies);
      if (data.investments) await db.investments.bulkPut(data.investments);
      if (data.goals) await db.goals.bulkPut(data.goals);
      if (data.lifeEvents) await db.lifeEvents.bulkPut(data.lifeEvents);
      if (data.scenarios) await db.scenarios.bulkPut(data.scenarios);
      if (data.people) await db.people.bulkPut(data.people);
      if (data.settings) await db.settings.bulkPut(data.settings);
      setImportStatus('Import successful!');
    } catch (err) {
      setImportStatus(`Import failed: ${err}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleClearAll = async () => {
    await Promise.all([
      db.accounts.clear(), db.transactions.clear(), db.categories.clear(),
      db.recurringRules.clear(), db.assets.clear(), db.liabilities.clear(),
      db.insurancePolicies.clear(), db.investments.clear(), db.goals.clear(),
      db.lifeEvents.clear(), db.scenarios.clear(), db.people.clear(),
      db.settings.clear(), db.monthlySnapshots.clear(), db.auditLog.clear(),
    ]);
    window.location.reload();
  };

  return (
    <PageLayout>
      <div className="max-w-xl space-y-6">
        <Card>
          <CardHeader><CardTitle>Export Data</CardTitle></CardHeader>
          <p className="text-sm text-text-secondary mb-4">Download all your financial data as a JSON file. You can use this for backup or to import into another device.</p>
          <Button onClick={handleExport}><Download size={14} className="mr-2" />Export JSON</Button>
        </Card>

        <Card>
          <CardHeader><CardTitle>Import Data</CardTitle></CardHeader>
          <p className="text-sm text-text-secondary mb-4">Import a previously exported Atlas JSON file. This will merge with your existing data.</p>
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-surface-raised text-text-primary border border-border hover:bg-border transition-colors">
            <Upload size={14} />{importing ? 'Importing...' : 'Choose File'}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
          {importStatus && <p className={`mt-3 text-sm ${importStatus.includes('failed') ? 'text-negative' : 'text-positive'}`}>{importStatus}</p>}
        </Card>

        <Card className="border-negative/30">
          <CardHeader><CardTitle>Danger Zone</CardTitle></CardHeader>
          <p className="text-sm text-text-secondary mb-4">Clear all data from this device. This action cannot be undone.</p>
          <Button variant="danger" onClick={() => setShowClear(true)}><Trash2 size={14} className="mr-2" />Clear All Data</Button>
        </Card>
      </div>

      <ConfirmDialog
        open={showClear}
        onClose={() => setShowClear(false)}
        onConfirm={handleClearAll}
        title="Clear All Data"
        message="This will permanently delete ALL your financial data from this device. This cannot be undone."
        confirmLabel="Delete Everything"
        destructive
        requireTyping="DELETE ALL DATA"
      />
    </PageLayout>
  );
}
