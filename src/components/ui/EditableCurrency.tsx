import { useState, useEffect, useRef } from 'react';
import { Check, X, Pencil } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { cn } from '../../lib/utils';
import { MoneyDisplay } from './MoneyDisplay';

interface EditableCurrencyProps {
  value: number;
  currency?: string;
  onSave: (newValue: number) => Promise<void> | void;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'left' | 'right';
  compact?: boolean;
  ariaLabel?: string;
}

export function EditableCurrency({
  value,
  currency,
  onSave,
  className,
  size = 'md',
  align = 'right',
  compact,
  ariaLabel,
}: EditableCurrencyProps) {
  const { currency: appCurrency } = useAppStore();
  const cur = currency || appCurrency;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl', xl: 'text-3xl' };

  const handleSave = async () => {
    const num = Number(draft.replace(/,/g, ''));
    if (isNaN(num)) {
      setEditing(false);
      setDraft(String(value));
      return;
    }
    setSaving(true);
    try {
      await onSave(num);
      setEditing(false);
    } catch {
      /* keep editing */
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(String(value));
  };

  if (editing) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 group',
          align === 'right' ? 'justify-end' : ''
        )}
      >
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          disabled={saving}
          className={cn(
            'font-mono tabular-nums bg-transparent border-b-2 border-accent focus:outline-none w-32 px-1',
            sizes[size],
            align === 'right' && 'text-right'
          )}
        />
        <button
          onClick={handleSave}
          disabled={saving}
          aria-label="Save"
          className="text-positive hover:bg-surface-raised rounded p-0.5 transition-colors"
        >
          <Check size={14} />
        </button>
        <button
          onClick={handleCancel}
          disabled={saving}
          aria-label="Cancel"
          className="text-text-tertiary hover:bg-surface-raised rounded p-0.5 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      aria-label={ariaLabel || 'Edit value'}
      className={cn(
        'group inline-flex items-center gap-1.5 font-mono tabular-nums hover:bg-surface-raised rounded-md px-1.5 -mx-1.5 py-0.5 transition-colors cursor-text',
        sizes[size],
        align === 'right' && 'justify-end',
        className
      )}
    >
      <MoneyDisplay
        value={value}
        currency={cur}
        size={size === 'xl' ? 'xl' : size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md'}
        compact={compact}
      />
      <Pencil
        size={11}
        className="opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0"
      />
    </button>
  );
}
