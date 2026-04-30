import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> & {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, suffix, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div
          className={cn(
            'flex items-center rounded-lg border bg-surface-raised transition-colors focus-within:border-accent focus-within:ring-1 focus-within:ring-accent',
            error ? 'border-negative' : 'border-border'
          )}
        >
          {prefix && <span className="pl-3 text-text-tertiary text-sm">{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'flex-1 bg-transparent px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none',
              prefix && 'pl-1',
              suffix && 'pr-1',
              className
            )}
            {...props}
          />
          {suffix && <span className="pr-3 text-text-tertiary text-sm">{suffix}</span>}
        </div>
        {error && <p className="text-xs text-negative">{error}</p>}
        {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
