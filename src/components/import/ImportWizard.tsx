import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { db, type Account, type Category, type Transaction } from '../../db/schema';
import { Button, Modal, Select, Badge, EmptyState, Skeleton } from '../ui';
import { formatCurrency } from '../../lib/format';
import { generateId } from '../../lib/utils';
import {
  parseCSV,
  detectFormat,
  applyMapping,
  type ParsedCSV,
  type ColumnMapping,
  type ImportableTx,
  type AmountSign,
} from '../../lib/csvImport';
import { batchMatch } from '../../lib/categoryMatcher';

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
}

interface PreparedRow extends ImportableTx {
  id: string;
  categoryId?: string;
  selected: boolean;
  isDuplicate: boolean;
}

const STEPS = ['Upload', 'Account', 'Mapping', 'Preview', 'Confirm'] as const;

const DATE_FORMAT_OPTIONS = [
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd' },
  { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy' },
  { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy' },
  { value: 'dd-MM-yyyy', label: 'dd-MM-yyyy' },
  { value: 'yyyy/MM/dd', label: 'yyyy/MM/dd' },
  { value: 'dd MMM yyyy', label: 'dd MMM yyyy' },
  { value: 'd MMM yyyy', label: 'd MMM yyyy' },
  { value: 'dd-MMM-yyyy', label: 'dd-MMM-yyyy' },
];

const NONE = '__none__';

export function ImportWizard({ open, onClose }: ImportWizardProps) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [accountId, setAccountId] = useState<string>('');

  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [dateFormat, setDateFormat] = useState<string>('yyyy-MM-dd');
  const [decimalSeparator, setDecimalSeparator] = useState<'.' | ','>('.');
  const [amountSign, setAmountSign] = useState<AmountSign>('signed');
  const [bankName, setBankName] = useState<string | undefined>(undefined);

  const [rows, setRows] = useState<PreparedRow[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const accounts = useLiveQuery(
    () => db.accounts.filter(a => a.isActive).toArray(),
    [],
  );
  const categories = useLiveQuery(() => db.categories.toArray(), []);

  // Reset on close
  useEffect(() => {
    if (!open) {
      // Slight delay so we don't visibly reset during the close animation.
      const t = setTimeout(() => {
        setStep(0);
        setError(null);
        setFile(null);
        setParsed(null);
        setAccountId('');
        setMapping(null);
        setDateFormat('yyyy-MM-dd');
        setDecimalSeparator('.');
        setAmountSign('signed');
        setBankName(undefined);
        setRows([]);
        setCompleted(false);
        setImportedCount(0);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  const handleParse = useCallback(async (f: File) => {
    setError(null);
    try {
      const text = await f.text();
      const result = parseCSV(text);
      if (result.headers.length === 0 || result.rows.length === 0) {
        setError('CSV looks empty. Please choose a file with at least one header row and one data row.');
        return;
      }
      setFile(f);
      setParsed(result);
      const detected = detectFormat(result);
      setMapping({
        date: detected.mapping.date ?? '',
        description: detected.mapping.description ?? '',
        amount: detected.mapping.amount ?? '',
        credit: detected.mapping.credit,
        debit: detected.mapping.debit,
        category: detected.mapping.category,
        balance: detected.mapping.balance,
      });
      setDateFormat(detected.dateFormat);
      setDecimalSeparator(detected.decimalSeparator);
      setAmountSign(detected.amountSign);
      setBankName(detected.bank);
      setStep(1);
    } catch (e) {
      console.error(e);
      setError('Failed to read the file. Please try again.');
    }
  }, []);

  const handlePreview = useCallback(async () => {
    if (!parsed || !mapping) return;
    setError(null);
    setLoadingPreview(true);
    try {
      const valid = mapping.date && mapping.description && (
        amountSign === 'signed' ? !!mapping.amount : (!!mapping.credit && !!mapping.debit)
      );
      if (!valid) {
        setError('Please pick a date, description, and either a single Amount column or both Credit/Debit columns.');
        setLoadingPreview(false);
        return;
      }

      const importable = applyMapping(parsed, mapping, dateFormat, decimalSeparator, amountSign);
      if (importable.length === 0) {
        setError('No rows could be parsed. Check your column mapping and date format.');
        setLoadingPreview(false);
        return;
      }

      // Auto-categorise
      const matches = await batchMatch(importable.map(t => ({ description: t.description })));

      // Duplicate detection — fetch existing transactions for this account.
      const existing = accountId
        ? await db.transactions.where('accountId').equals(accountId).toArray()
        : [];
      const existingKeys = new Set(
        existing.map(t => `${t.date}|${t.description.toLowerCase()}|${t.amount.toFixed(2)}`),
      );

      const prepared: PreparedRow[] = importable.map((tx, i) => {
        const key = `${tx.date}|${tx.description.toLowerCase()}|${tx.amount.toFixed(2)}`;
        const isDup = existingKeys.has(key);
        return {
          ...tx,
          id: `tmp-${i}-${Math.random().toString(36).slice(2, 8)}`,
          categoryId: matches[i]?.categoryId,
          selected: !isDup,
          isDuplicate: isDup,
        };
      });
      setRows(prepared);
      setStep(3);
    } catch (e) {
      console.error(e);
      setError('Could not build a preview. Please double-check the mapping.');
    } finally {
      setLoadingPreview(false);
    }
  }, [parsed, mapping, dateFormat, decimalSeparator, amountSign, accountId]);

  const handleCommit = useCallback(async () => {
    if (!accountId) return;
    setCommitting(true);
    setError(null);
    try {
      const importBatchId = generateId();
      const now = new Date().toISOString();
      const toInsert: Transaction[] = rows
        .filter(r => r.selected)
        .map(r => ({
          id: generateId(),
          accountId,
          date: r.date,
          description: r.description,
          amount: r.amount,
          type: r.type,
          categoryId: r.categoryId || undefined,
          isReviewed: false,
          tags: [],
          importBatchId,
          createdAt: now,
          updatedAt: now,
        }));

      if (toInsert.length === 0) {
        setError('Nothing selected to import.');
        setCommitting(false);
        return;
      }

      // Compute net change for the account: income +, expense -
      const netChange = toInsert.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

      await db.transaction('rw', db.transactions, db.accounts, async () => {
        await db.transactions.bulkAdd(toInsert);
        const acc = await db.accounts.get(accountId);
        if (acc) {
          await db.accounts.update(accountId, {
            balance: acc.balance + netChange,
            updatedAt: now,
          });
        }
      });

      setImportedCount(toInsert.length);
      setCompleted(true);
      setStep(4);
    } catch (e) {
      console.error(e);
      setError('Failed to write transactions. Please try again.');
    } finally {
      setCommitting(false);
    }
  }, [accountId, rows]);

  const canNext = useMemo(() => {
    if (step === 0) return !!parsed;
    if (step === 1) return !!accountId;
    if (step === 2) {
      if (!mapping) return false;
      if (!mapping.date || !mapping.description) return false;
      if (amountSign === 'signed') return !!mapping.amount;
      return !!mapping.credit && !!mapping.debit;
    }
    if (step === 3) return rows.some(r => r.selected);
    return false;
  }, [step, parsed, accountId, mapping, amountSign, rows]);

  const selectedAccount = (accounts ?? []).find(a => a.id === accountId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={completed ? 'Import complete' : 'Import bank statement'}
      size="xl"
    >
      <div className="space-y-5">
        {!completed && <Stepper step={step} />}

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-negative/10 text-negative text-sm">
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 0: Upload */}
        {step === 0 && !completed && (
          <UploadStep onFile={handleParse} bankName={bankName} parsedRows={parsed?.rows.length ?? 0} fileName={file?.name} />
        )}

        {/* Step 1: Account */}
        {step === 1 && !completed && (
          <AccountStep
            accounts={accounts ?? []}
            accountId={accountId}
            onSelect={setAccountId}
            bankName={bankName}
          />
        )}

        {/* Step 2: Mapping */}
        {step === 2 && !completed && parsed && mapping && (
          <MappingStep
            parsed={parsed}
            mapping={mapping}
            setMapping={setMapping}
            dateFormat={dateFormat}
            setDateFormat={setDateFormat}
            decimalSeparator={decimalSeparator}
            setDecimalSeparator={setDecimalSeparator}
            amountSign={amountSign}
            setAmountSign={setAmountSign}
          />
        )}

        {/* Step 3: Preview */}
        {step === 3 && !completed && (
          <PreviewStep
            rows={rows}
            setRows={setRows}
            categories={categories ?? []}
            account={selectedAccount}
            loading={loadingPreview}
          />
        )}

        {/* Step 4: Done */}
        {completed && (
          <div className="flex flex-col items-center text-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-positive/10 text-positive flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="text-base font-semibold text-text-primary">
              Imported {importedCount} {importedCount === 1 ? 'transaction' : 'transactions'}
            </h3>
            {selectedAccount && (
              <p className="text-sm text-text-tertiary">
                New balance: {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            {completed ? 'Close' : 'Cancel'}
          </Button>

          {!completed && (
            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="secondary" onClick={() => setStep(s => Math.max(0, s - 1))}>
                  Back
                </Button>
              )}
              {step < 2 && (
                <Button onClick={() => setStep(s => s + 1)} disabled={!canNext}>
                  Next
                </Button>
              )}
              {step === 2 && (
                <Button onClick={handlePreview} disabled={!canNext} loading={loadingPreview}>
                  Preview
                </Button>
              )}
              {step === 3 && (
                <Button onClick={handleCommit} disabled={!canNext} loading={committing}>
                  Import {rows.filter(r => r.selected).length}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1">
          <div
            className={`flex items-center gap-2 rounded-full px-2 py-1 text-xs ${
              i === step
                ? 'bg-accent text-white'
                : i < step
                ? 'text-positive'
                : 'text-text-tertiary'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold ${
              i === step ? 'bg-white/20' : i < step ? 'bg-positive/15' : 'bg-surface-raised'
            }`}>{i + 1}</span>
            <span className="hidden sm:inline font-medium">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px flex-1 ${i < step ? 'bg-positive/40' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function UploadStep({
  onFile,
  bankName,
  parsedRows,
  fileName,
}: {
  onFile: (f: File) => void;
  bankName?: string;
  parsedRows: number;
  fileName?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`w-full rounded-2xl border-2 border-dashed transition-colors p-10 flex flex-col items-center gap-3 ${
          dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/60'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-surface-raised flex items-center justify-center text-text-secondary">
          <Upload size={20} />
        </div>
        <p className="text-sm font-medium text-text-primary">
          Drop CSV here or click to browse
        </p>
        <p className="text-xs text-text-tertiary">
          Supports Emirates NBD, Mashreq, ADCB, Revolut, Wise and most generic bank CSVs.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
          }}
        />
      </button>

      {fileName && parsedRows > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-raised">
          <FileText size={16} className="text-text-secondary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">{fileName}</p>
            <p className="text-xs text-text-tertiary">
              {parsedRows} rows
              {bankName ? ` · Detected: ${bankName}` : ''}
            </p>
          </div>
          {bankName && <Badge variant="accent">{bankName}</Badge>}
        </div>
      )}
    </div>
  );
}

function AccountStep({
  accounts,
  accountId,
  onSelect,
  bankName,
}: {
  accounts: Account[];
  accountId: string;
  onSelect: (id: string) => void;
  bankName?: string;
}) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        title="No accounts yet"
        description="Create an account before importing transactions."
      />
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-text-secondary">
        Pick the Atlas account these transactions belong to.
        {bankName && ` (CSV looks like a ${bankName} statement.)`}
      </p>
      <div className="grid gap-2">
        {accounts.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
              accountId === a.id
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-accent/60'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{a.name}</p>
                <p className="text-xs text-text-tertiary">
                  {a.type}
                  {a.provider ? ` · ${a.provider}` : ''}
                </p>
              </div>
              <span className="font-mono text-sm text-text-secondary">
                {formatCurrency(a.balance, a.currency)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MappingStep({
  parsed,
  mapping,
  setMapping,
  dateFormat,
  setDateFormat,
  decimalSeparator,
  setDecimalSeparator,
  amountSign,
  setAmountSign,
}: {
  parsed: ParsedCSV;
  mapping: ColumnMapping;
  setMapping: (m: ColumnMapping) => void;
  dateFormat: string;
  setDateFormat: (f: string) => void;
  decimalSeparator: '.' | ',';
  setDecimalSeparator: (s: '.' | ',') => void;
  amountSign: AmountSign;
  setAmountSign: (a: AmountSign) => void;
}) {
  const headerOptions = useMemo(
    () => [{ value: '', label: '— Select column —' }, ...parsed.headers.map(h => ({ value: h, label: h }))],
    [parsed.headers],
  );
  const optionalHeaderOptions = useMemo(
    () => [{ value: NONE, label: '— None —' }, ...parsed.headers.map(h => ({ value: h, label: h }))],
    [parsed.headers],
  );

  const update = (patch: Partial<ColumnMapping>) => setMapping({ ...mapping, ...patch });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select
          label="Date column"
          options={headerOptions}
          value={mapping.date}
          onChange={e => update({ date: e.target.value })}
        />
        <Select
          label="Date format"
          options={DATE_FORMAT_OPTIONS}
          value={dateFormat}
          onChange={e => setDateFormat(e.target.value)}
        />
        <Select
          label="Description column"
          options={headerOptions}
          value={mapping.description}
          onChange={e => update({ description: e.target.value })}
        />
        <Select
          label="Decimal separator"
          options={[
            { value: '.', label: 'Period (.)' },
            { value: ',', label: 'Comma (,)' },
          ]}
          value={decimalSeparator}
          onChange={e => setDecimalSeparator(e.target.value as '.' | ',')}
        />
        <Select
          label="Amount style"
          options={[
            { value: 'signed', label: 'Single signed amount column' },
            { value: 'split', label: 'Separate Credit / Debit columns' },
          ]}
          value={amountSign}
          onChange={e => setAmountSign(e.target.value as AmountSign)}
        />
        {amountSign === 'signed' ? (
          <Select
            label="Amount column"
            options={headerOptions}
            value={mapping.amount}
            onChange={e => update({ amount: e.target.value })}
          />
        ) : (
          <>
            <Select
              label="Credit column"
              options={headerOptions}
              value={mapping.credit ?? ''}
              onChange={e => update({ credit: e.target.value })}
            />
            <Select
              label="Debit column"
              options={headerOptions}
              value={mapping.debit ?? ''}
              onChange={e => update({ debit: e.target.value })}
            />
          </>
        )}
        <Select
          label="Balance column (optional)"
          options={optionalHeaderOptions}
          value={mapping.balance ?? NONE}
          onChange={e =>
            update({ balance: e.target.value === NONE ? undefined : e.target.value })
          }
        />
      </div>

      <div>
        <p className="text-xs font-medium text-text-secondary mb-2">First 5 rows</p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-surface-raised">
              <tr>
                {parsed.headers.map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-text-secondary whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsed.rows.slice(0, 5).map((row, i) => (
                <tr key={i} className="border-t border-border">
                  {parsed.headers.map(h => (
                    <td key={h} className="px-3 py-2 text-text-primary whitespace-nowrap font-mono">
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PreviewStep({
  rows,
  setRows,
  categories,
  account,
  loading,
}: {
  rows: PreparedRow[];
  setRows: (r: PreparedRow[]) => void;
  categories: Category[];
  account?: Account;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return <EmptyState title="No rows to preview" description="Go back and adjust your mapping." />;
  }

  const catOptions = [
    { value: '', label: '— No category —' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ];

  const toggleAll = (selected: boolean) => {
    setRows(rows.map(r => ({ ...r, selected })));
  };

  const update = (id: string, patch: Partial<PreparedRow>) => {
    setRows(rows.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const selectedCount = rows.filter(r => r.selected).length;
  const dupCount = rows.filter(r => r.isDuplicate).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {selectedCount} of {rows.length} selected
          {dupCount > 0 && (
            <span className="ml-2 text-warning">· {dupCount} possible duplicate{dupCount === 1 ? '' : 's'}</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => toggleAll(true)}>
            Select all
          </Button>
          <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>
            Clear
          </Button>
        </div>
      </div>

      <div className="overflow-y-auto max-h-[420px] rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead className="bg-surface-raised sticky top-0">
            <tr>
              <th className="px-2 py-2 w-8"></th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary">Date</th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary">Description</th>
              <th className="px-3 py-2 text-left font-semibold text-text-secondary">Category</th>
              <th className="px-3 py-2 text-right font-semibold text-text-secondary">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.id}
                className={`border-t border-border ${
                  r.isDuplicate ? 'bg-warning/5' : ''
                } ${!r.selected ? 'opacity-50' : ''}`}
              >
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={r.selected}
                    onChange={e => update(r.id, { selected: e.target.checked })}
                    className="accent-accent"
                  />
                </td>
                <td className="px-3 py-2 font-mono text-text-primary whitespace-nowrap">{r.date}</td>
                <td className="px-3 py-2 text-text-primary">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[260px]">{r.description}</span>
                    {r.isDuplicate && (
                      <Badge variant="warning" className="flex-shrink-0">
                        Duplicate
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={r.categoryId ?? ''}
                    onChange={e => update(r.id, { categoryId: e.target.value || undefined })}
                    className="bg-surface-raised border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-accent w-full"
                  >
                    {catOptions.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={`px-3 py-2 text-right font-mono whitespace-nowrap ${
                  r.type === 'income' ? 'text-positive' : 'text-text-primary'
                }`}>
                  {r.type === 'income' ? '+' : '-'}
                  {formatCurrency(r.amount, account?.currency || 'AED')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

