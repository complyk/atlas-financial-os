import { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div
          className={cn(
            'relative flex items-center rounded-lg border bg-surface-raised transition-colors focus-within:border-accent',
            error ? 'border-negative' : 'border-border'
          )}
        >
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none bg-transparent px-3 py-2 text-sm text-text-primary focus:outline-none pr-8',
              className
            )}
            {...props}
          >
            {options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 text-text-tertiary pointer-events-none" />
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
