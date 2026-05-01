import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { EditableCurrency } from '../ui/EditableCurrency';
import { Tabs } from '../ui/Tabs';
import { db } from '../../db/schema';

export function QuickUpdatePanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'accounts' | 'assets' | 'liabilities'>('accounts');
  const accounts = useLiveQuery(
    () => db.accounts.filter((a) => a.isActive).toArray(),
    []
  );
  const assets = useLiveQuery(() => db.assets.toArray(), []);
  const liabilities = useLiveQuery(() => db.liabilities.toArray(), []);

  return (
    <Modal open={open} onClose={onClose} title="Quick Update Balances" size="lg">
      <Tabs
        tabs={[
          { id: 'accounts', label: 'Accounts', count: accounts?.length },
          { id: 'assets', label: 'Assets', count: assets?.length },
          { id: 'liabilities', label: 'Liabilities', count: liabilities?.length },
        ]}
        activeTab={tab}
        onChange={(t) => setTab(t as 'accounts' | 'assets' | 'liabilities')}
      />
      <div className="mt-4 max-h-[60vh] overflow-y-auto">
        {tab === 'accounts' &&
          accounts?.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between py-3 border-b border-border-subtle"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{a.name}</p>
                <p className="text-xs text-text-tertiary">{a.provider}</p>
              </div>
              <EditableCurrency
                value={a.balance}
                currency={a.currency}
                size="md"
                onSave={async (v) => {
                  await db.accounts.update(a.id, {
                    balance: v,
                    updatedAt: new Date().toISOString(),
                  } as Partial<typeof a>);
                }}
              />
            </div>
          ))}
        {tab === 'accounts' && accounts && accounts.length === 0 && (
          <p className="text-sm text-text-tertiary py-6 text-center">
            No active accounts to update.
          </p>
        )}
        {tab === 'assets' &&
          assets?.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between py-3 border-b border-border-subtle"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{a.name}</p>
                <p className="text-xs text-text-tertiary capitalize">
                  {a.type.replace(/_/g, ' ')}
                </p>
              </div>
              <EditableCurrency
                value={a.currentValue}
                currency={a.currency}
                size="md"
                onSave={async (v) => {
                  await db.assets.update(a.id, {
                    currentValue: v,
                    updatedAt: new Date().toISOString(),
                  } as Partial<typeof a>);
                }}
              />
            </div>
          ))}
        {tab === 'assets' && assets && assets.length === 0 && (
          <p className="text-sm text-text-tertiary py-6 text-center">
            No assets to update.
          </p>
        )}
        {tab === 'liabilities' &&
          liabilities?.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between py-3 border-b border-border-subtle"
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{l.name}</p>
                <p className="text-xs text-text-tertiary capitalize">
                  {l.type.replace(/_/g, ' ')}
                </p>
              </div>
              <EditableCurrency
                value={l.outstandingBalance}
                size="md"
                onSave={async (v) => {
                  await db.liabilities.update(l.id, {
                    outstandingBalance: v,
                    updatedAt: new Date().toISOString(),
                  } as Partial<typeof l>);
                }}
              />
            </div>
          ))}
        {tab === 'liabilities' && liabilities && liabilities.length === 0 && (
          <p className="text-sm text-text-tertiary py-6 text-center">
            No liabilities to update.
          </p>
        )}
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
