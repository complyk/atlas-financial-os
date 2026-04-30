import { forwardRef, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  step?: number;
  value?: number | string;
  onChange?: (value: number) => void;
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ label, error, prefix, suffix, step = 1, className, onChange, value, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const numValue = Number(value) || 0;
    const increment = () => onChange?.(numValue + step);
    const decrement = () => onChange?.(numValue - step);
    const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === '+') { e.preventDefault(); increment(); }
      if (e.key === '-') { e.preventDefault(); decrement(); }
    }, [numValue, step]);
    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">{label}</label>}
        <div className={cn('flex items-center rounded-lg border bg-surface-raised transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent', error ? 'border-negative' : 'border-border')}>
          {prefix && <span className="pl-3 text-text-tertiary text-sm">{prefix}</span>}
          <input
            ref={ref} id={inputId} type="number" value={value}
            onChange={e => onChange?.(Number(e.target.value))}
            onKeyDown={handleKey} step={step}
            className={cn('flex-1 bg-transparent px-3 py-2 text-sm text-text-primary font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none', prefix && 'pl-1', suffix && 'pr-1', className)}
            {...props}
          />
          {suffix && <span className="pr-2 text-text-tertiary text-sm">{suffix}</span>}
          <div className="flex flex-col border-l border-border">
            <button type="button" tabIndex={-1} onClick={increment} className="px-2 py-1 hover:bg-surface-raised text-text-tertiary"><ChevronUp size={10} /></button>
            <button type="button" tabIndex={-1} onClick={decrement} className="px-2 py-1 hover:bg-surface-raised text-text-tertiary border-t border-border"><ChevronDown size={10} /></button>
          </div>
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
      </div>
    );
  }
);
NumberInput.displayName = 'NumberInput';
