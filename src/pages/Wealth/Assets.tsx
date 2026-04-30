import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { db, type Asset, type AssetType } from '../../db/schema';
import { Card, Button, Modal, Input, Select, NumberInput, EmptyState, Skeleton, ConfirmDialog, Badge } from '../../components/ui';
import { PageLayout } from '../../components/layout/PageLayout';
import { formatCurrency, formatPercent } from '../../lib/format';
import { generateId } from '../../lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  property: 'Property', vehicle: 'Vehicle', valuable: 'Valuable', business_equity: 'Business Equity', other: 'Other',
};

const schema = z.object({
  name: z.string().min(1),
  type: z.string(),
  currentValue: z.number().min(0),
  purchaseValue: z.number().optional(),
  purchaseDate: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function AssetForm({ asset, onClose }: { asset?: Asset; onClose: () => void }) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: asset ? { ...asset } : { type: 'property', currentValue: 0 },
  });
  const onSubmit = async (data: FormData) => {
    const ts = new Date().toISOString();
    if (asset) {
      await db.assets.update(asset.id, { ...data, updatedAt: ts });
    } else {
      await db.assets.add({ ...data as any, id: generateId(), currency: 'AED', includeInNetWorth: true, createdAt: ts, updatedAt: ts });
    }
    onClose();
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Asset Name" error={errors.name?.message} {...register('name')} placeholder="e.g. Dubai Marina Apartment" />
      <Select label="Type" options={Object.entries(ASSET_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} {...register('type')} />
      <Controller name="currentValue" control={control} render={({ field }) => <NumberInput label="Current Value" prefix="AED" value={field.value} onChange={field.onChange} step={1000} />} />
      <Controller name="purchaseValue" control={control} render={({ field }) => <NumberInput label="Purchase Value (optional)" prefix="AED" value={field.value || ''} onChange={field.onChange} step={1000} />} />
      <Input label="Purchase Date (optional)" type="date" {...register('purchaseDate')} />
      <Input label="Address / Description (optional)" {...register('address')} />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">{asset ? 'Save' : 'Add Asset'}</Button>
      </div>
    </form>
  );
}

export default function Assets() {
  const assets = useLiveQuery(() => db.assets.filter(a => a.includeInNetWorth !== false).toArray(), []);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalValue = assets?.reduce((s, a) => s + a.currentValue, 0) ?? 0;

  return (
    <PageLayout actions={<Button onClick={() => setShowAdd(true)} size="sm"><Plus size={14} className="mr-1" />Add Asset</Button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card><p className="text-xs text-text-tertiary mb-1">Total Asset Value</p><p className="font-mono text-2xl font-bold text-text-primary">{formatCurrency(totalValue, 'AED', 'en-AE', true)}</p></Card>
        <Card><p className="text-xs text-text-tertiary mb-1">Assets</p><p className="font-mono text-2xl font-bold text-text-primary">{assets?.length ?? 0}</p></Card>
      </div>

      {!assets ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-44 rounded-2xl"/>)}</div>
        : assets.length === 0 ? <EmptyState title="No assets" description="Add property, vehicles, or other valuable assets." action={<Button onClick={() => setShowAdd(true)}><Plus size={14} />Add Asset</Button>} />
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map(asset => {
              const gain = asset.purchaseValue ? asset.currentValue - asset.purchaseValue : null;
              const gainPct = gain !== null && asset.purchaseValue ? gain / asset.purchaseValue : null;
              return (
                <Card key={asset.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="default">{ASSET_TYPE_LABELS[asset.type]}</Badge>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditAsset(asset)}><Edit2 size={13} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteId(asset.id)}><Trash2 size={13} /></Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{asset.name}</p>
                    {asset.address && <p className="text-xs text-text-tertiary truncate">{asset.address}</p>}
                  </div>
                  <p className="font-mono text-xl font-bold text-text-primary">{formatCurrency(asset.currentValue, asset.currency || 'AED', 'en-AE', true)}</p>
                  {gain !== null && gainPct !== null && (
                    <p className={`text-xs font-mono ${gain >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {gain >= 0 ? '+' : ''}{formatCurrency(gain, 'AED', 'en-AE', true)} ({gain >= 0 ? '+' : ''}{(gainPct * 100).toFixed(1)}%)
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Asset"><AssetForm onClose={() => setShowAdd(false)} /></Modal>
      <Modal open={!!editAsset} onClose={() => setEditAsset(null)} title="Edit Asset">{editAsset && <AssetForm asset={editAsset} onClose={() => setEditAsset(null)} />}</Modal>
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={async () => { if (deleteId) { await db.assets.delete(deleteId); setDeleteId(null); } }} title="Delete Asset" message="This will permanently remove this asset." confirmLabel="Delete" destructive />
    </PageLayout>
  );
}
