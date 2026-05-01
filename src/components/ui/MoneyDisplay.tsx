import { useAppStore } from '../../stores/useAppStore';
import { cn } from '../../lib/utils';

interface MoneyDisplayProps {
  value: number;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  compact?: boolean;
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export function MoneyDisplay({
  value,
  currency,
  size = 'md',
  compact,
  className,
  trend,
}: MoneyDisplayProps) {
  const { currency: appCurrency, locale } = useAppStore();
  const cur = currency || appCurrency;
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
    '2xl': 'text-5xl',
  };
  const trendColor =
    trend === 'up'
      ? 'text-positive'
      : trend === 'down'
        ? 'text-negative'
        : 'text-text-primary';

  let formatted: string;
  if (compact && Math.abs(value) >= 10000) {
    formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } else {
    formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: cur,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  // Split currency code from number if present at start.
  // The Intl format may be "AED 1,234.56" or "د.إ.‏ 1,234.56" depending on locale.
  // We want the number to be prominent, currency code small.
  const match = formatted.match(/^([^\d-]+)?(-?[\d,.]+[KMB]?)(.*)$/);
  if (match) {
    const [, prefix, num, suffix] = match;
    return (
      <span
        className={cn('font-mono tabular-nums', sizes[size], trendColor, className)}
      >
        {prefix && (
          <span className="text-text-tertiary text-[0.7em] uppercase tracking-wider mr-1">
            {prefix.trim()}
          </span>
        )}
        <span className="font-semibold">{num}</span>
        {suffix && (
          <span className="text-text-tertiary text-[0.7em] uppercase tracking-wider ml-1">
            {suffix.trim()}
          </span>
        )}
      </span>
    );
  }
  return (
    <span className={cn('font-mono tabular-nums', sizes[size], trendColor, className)}>
      {formatted}
    </span>
  );
}
