import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2, ChevronDown, ChevronRight, Trash } from 'lucide-react';
import { db, type Scenario, type ScenarioOverrides, type IncomeShock, type OneOffItem } from '../../db/schema';
import { Card, Button, Modal, Input, NumberInput, EmptyState, Skeleton, ConfirmDialog, Badge, Toggle } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { generateId } from '../../lib/utils';
import { useAppStore } from '../../stores/useAppStore';

interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Accordion({ title, defaultOpen, children }: AccordionProps) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-surface-raised hover:bg-surface text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-text-primary">{title}</span>
        {open ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronRight size={14} className="text-text-tertiary" />}
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

interface ScenarioFormProps {
  scenario?: Scenario;
  onClose: () => void;
}

interface FormState {
  name: string;
  description: string;
  color: string;
  primaryShockEnabled: boolean;
  primaryShock: IncomeShock;
  secondaryShockEnabled: boolean;
  secondaryShock: IncomeShock;
  globalSpendingMultiplier: number;
  spendingEnabled: boolean;
  investmentReturnEnabled: boolean;
  investmentReturnOverride: number;
  retirementEnabled: boolean;
  retirementAgeOverride: number;
  oneOffItems: OneOffItem[];
}

const today = () => new Date().toISOString().slice(0, 10);

function buildInitialState(scenario?: Scenario): FormState {
  const o = scenario?.overrides ?? {};
  return {
    name: scenario?.name ?? '',
    description: scenario?.description ?? '',
    color: scenario?.color ?? '#3b82f6',
    primaryShockEnabled: !!o.primaryIncomeShock,
    primaryShock: o.primaryIncomeShock ?? { startDate: today(), durationMonths: 6, multiplier: 0 },
    secondaryShockEnabled: !!o.secondaryIncomeShock,
    secondaryShock: o.secondaryIncomeShock ?? { startDate: today(), durationMonths: 6, multiplier: 0 },
    spendingEnabled: o.globalSpendingMultiplier !== undefined,
    globalSpendingMultiplier: o.globalSpendingMultiplier ?? 1,
    investmentReturnEnabled: o.investmentReturnOverride !== undefined,
    investmentReturnOverride: o.investmentReturnOverride ?? 0,
    retirementEnabled: o.retirementAgeOverride !== undefined,
    retirementAgeOverride: o.retirementAgeOverride ?? 60,
    oneOffItems: o.oneOffItems ?? [],
  };
}

function ScenarioForm({ scenario, onClose }: ScenarioFormProps) {
  const { currency } = useAppStore();
  const [state, setState] = useState<FormState>(() => buildInitialState(scenario));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (scenario?.isBaseline) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-text-secondary">Baseline cannot have overrides — it represents your default plan.</p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setState(s => ({ ...s, [key]: value }));

  const updateShock = (which: 'primaryShock' | 'secondaryShock', patch: Partial<IncomeShock>) =>
    setState(s => ({ ...s, [which]: { ...s[which], ...patch } }));

  const addOneOff = () =>
    setState(s => ({ ...s, oneOffItems: [...s.oneOffItems, { id: generateId(), date: today(), amount: 0, description: '' }] }));

  const removeOneOff = (id: string) =>
    setState(s => ({ ...s, oneOffItems: s.oneOffItems.filter(i => i.id !== id) }));

  const updateOneOff = (id: string, patch: Partial<OneOffItem>) =>
    setState(s => ({
      ...s,
      oneOffItems: s.oneOffItems.map(i => i.id === id ? { ...i, ...patch } : i),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.name.trim()) {
      setError('Name required');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const overrides: ScenarioOverrides = {};
      if (state.primaryShockEnabled) overrides.primaryIncomeShock = state.primaryShock;
      if (state.secondaryShockEnabled) overrides.secondaryIncomeShock = state.secondaryShock;
      if (state.spendingEnabled) overrides.globalSpendingMultiplier = state.globalSpendingMultiplier;
      if (state.investmentReturnEnabled) overrides.investmentReturnOverride = state.investmentReturnOverride;
      if (state.retirementEnabled) overrides.retirementAgeOverride = state.retirementAgeOverride;
      if (state.oneOffItems.length > 0) overrides.oneOffItems = state.oneOffItems;

      const ts = new Date().toISOString();
      if (scenario) {
        await db.scenarios.update(scenario.id, {
          name: state.name,
          description: state.description || undefined,
          color: state.color,
          overrides,
          updatedAt: ts,
        });
      } else {
        await db.scenarios.add({
          id: generateId(),
          name: state.name,
          description: state.description || undefined,
          color: state.color,
          isBaseline: false,
          overrides,
          createdAt: ts,
          updatedAt: ts,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Name" value={state.name} onChange={e => update('name', e.target.value)} error={error ?? undefined} />
      <Input label="Description (optional)" value={state.description} onChange={e => update('description', e.target.value)} />
      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-text-secondary">Colour</label>
          <input type="color" value={state.color} onChange={e => update('color', e.target.value)} className="h-10 w-10 rounded cursor-pointer border border-border" />
        </div>
      </div>

      <Accordion title="Income shocks">
        <div className="space-y-3">
          <Toggle
            checked={state.primaryShockEnabled}
            onChange={v => update('primaryShockEnabled', v)}
            label="Apply primary income shock"
          />
          {state.primaryShockEnabled && (
            <div className="grid grid-cols-3 gap-2 pl-12">
              <Input
                label="Start date"
                type="date"
                value={state.primaryShock.startDate}
                onChange={e => updateShock('primaryShock', { startDate: e.target.value })}
              />
              <NumberInput
                label="Duration (months)"
                value={state.primaryShock.durationMonths}
                onChange={v => updateShock('primaryShock', { durationMonths: v })}
                step={1}
              />
              <NumberInput
                label="Multiplier (0–1)"
                value={state.primaryShock.multiplier}
                onChange={v => updateShock('primaryShock', { multiplier: v })}
                step={0.1}
              />
            </div>
          )}
          <Toggle
            checked={state.secondaryShockEnabled}
            onChange={v => update('secondaryShockEnabled', v)}
            label="Apply secondary income shock"
          />
          {state.secondaryShockEnabled && (
            <div className="grid grid-cols-3 gap-2 pl-12">
              <Input
                label="Start date"
                type="date"
                value={state.secondaryShock.startDate}
                onChange={e => updateShock('secondaryShock', { startDate: e.target.value })}
              />
              <NumberInput
                label="Duration (months)"
                value={state.secondaryShock.durationMonths}
                onChange={v => updateShock('secondaryShock', { durationMonths: v })}
                step={1}
              />
              <NumberInput
                label="Multiplier (0–1)"
                value={state.secondaryShock.multiplier}
                onChange={v => updateShock('secondaryShock', { multiplier: v })}
                step={0.1}
              />
            </div>
          )}
        </div>
      </Accordion>

      <Accordion title="Spending">
        <Toggle
          checked={state.spendingEnabled}
          onChange={v => update('spendingEnabled', v)}
          label="Override global spending multiplier"
        />
        {state.spendingEnabled && (
          <div className="pl-12">
            <NumberInput
              label="Multiplier (1.0 = no change, 1.15 = +15%)"
              value={state.globalSpendingMultiplier}
              onChange={v => update('globalSpendingMultiplier', v)}
              step={0.05}
            />
          </div>
        )}
      </Accordion>

      <Accordion title="Investment returns">
        <Toggle
          checked={state.investmentReturnEnabled}
          onChange={v => update('investmentReturnEnabled', v)}
          label="Override annual investment return"
        />
        {state.investmentReturnEnabled && (
          <div className="pl-12">
            <NumberInput
              label="Annual return (decimal, e.g. -0.20 for 20% drop)"
              value={state.investmentReturnOverride}
              onChange={v => update('investmentReturnOverride', v)}
              step={0.01}
            />
          </div>
        )}
      </Accordion>

      <Accordion title="Retirement">
        <Toggle
          checked={state.retirementEnabled}
          onChange={v => update('retirementEnabled', v)}
          label="Override retirement age"
        />
        {state.retirementEnabled && (
          <div className="pl-12">
            <NumberInput
              label="Retirement age (years)"
              value={state.retirementAgeOverride}
              onChange={v => update('retirementAgeOverride', v)}
              step={1}
            />
          </div>
        )}
      </Accordion>

      <Accordion title="One-off items">
        <div className="space-y-2">
          {state.oneOffItems.length === 0 && <p className="text-xs text-text-tertiary">No one-off items.</p>}
          {state.oneOffItems.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3">
                <Input label="Date" type="date" value={item.date} onChange={e => updateOneOff(item.id, { date: e.target.value })} />
              </div>
              <div className="col-span-3">
                <NumberInput label={`Amount (${currency})`} value={item.amount} onChange={v => updateOneOff(item.id, { amount: v })} step={1000} />
              </div>
              <div className="col-span-5">
                <Input label="Description" value={item.description} onChange={e => updateOneOff(item.id, { description: e.target.value })} />
              </div>
              <div className="col-span-1 flex justify-center pb-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => removeOneOff(item.id)} aria-label={`Remove ${item.description || 'item'}`}>
                  <Trash size={13} />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="secondary" size="sm" onClick={addOneOff}>
            <Plus size={12} className="mr-1" />Add one-off item
          </Button>
        </div>
      </Accordion>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={saving}>{scenario ? 'Save' : 'Add Scenario'}</Button>
      </div>
    </form>
  );
}

export default function Scenarios() {
  const scenarios = useLiveQuery(() => db.scenarios.toArray(), []);
  const [editScenario, setEditScenario] = useState<Scenario | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Scenario</Button>}>
      {!scenarios ? <Skeleton className="h-64" />
        : scenarios.length === 0 ? <EmptyState title="No scenarios" description="Create scenarios to model different financial futures." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add</Button>} />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map(s => (
              <Card key={s.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color || '#3b82f6' }} />
                    {s.isBaseline && <Badge variant="positive">Baseline</Badge>}
                  </div>
                  <div className="flex gap-1">
                    {!s.isBaseline && <Button variant="ghost" size="sm" onClick={() => setEditScenario(s)} aria-label={`Edit ${s.name}`}><Edit2 size={13} /></Button>}
                    {!s.isBaseline && <Button variant="ghost" size="sm" onClick={() => setDeleteId(s.id)} aria-label={`Delete ${s.name}`}><Trash2 size={13} /></Button>}
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-primary">{s.name}</p>
                {s.description && <p className="text-xs text-text-secondary">{s.description}</p>}
                {Object.keys(s.overrides).length > 0 && (
                  <div className="mt-2 text-xs text-text-tertiary space-y-0.5">
                    {Object.entries(s.overrides).map(([key, val]) => (
                      <p key={key} className="truncate">{key}: {typeof val === 'object' ? JSON.stringify(val) : String(val)}</p>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Scenario" size="lg">
        <ScenarioForm onClose={() => setShowAdd(false)} />
      </Modal>
      <Modal open={!!editScenario} onClose={() => setEditScenario(null)} title="Edit Scenario" size="lg">
        {editScenario && <ScenarioForm scenario={editScenario} onClose={() => setEditScenario(null)} />}
      </Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.scenarios.delete(deleteId); setDeleteId(null); } }} title="Delete Scenario" message="This will permanently remove this scenario." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
