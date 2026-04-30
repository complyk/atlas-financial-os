import { X, BellOff } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatCurrency } from '../../lib/format';
import { useAppStore } from '../../stores/useAppStore';
import type { RecommendationOutput } from '../../lib/recommendations';

interface InsightCardProps {
  recommendation: RecommendationOutput & { id?: string };
  onDismiss?: () => void;
  onSnooze?: () => void;
  compact?: boolean;
}

export function InsightCard({ recommendation: r, onDismiss, onSnooze, compact }: InsightCardProps) {
  const { currency, locale } = useAppStore();
  const priorityVariant = { high: 'negative' as const, medium: 'warning' as const, low: 'default' as const };
  return (
    <Card className="relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-sm font-semibold text-text-primary">{r.title}</h3>
            <Badge variant={priorityVariant[r.priority]}>{r.priority}</Badge>
          </div>
          {!compact && <p className="text-sm text-text-secondary leading-relaxed">{r.body}</p>}
          {r.estimatedAnnualValue !== undefined && (
            <p className="mt-2 text-sm font-mono font-semibold text-accent">
              +{formatCurrency(r.estimatedAnnualValue, currency, locale, true)}/yr potential
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {onSnooze && <Button variant="ghost" size="sm" onClick={onSnooze} aria-label="Snooze 30 days"><BellOff size={14} /></Button>}
          {onDismiss && <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss"><X size={14} /></Button>}
        </div>
      </div>
    </Card>
  );
}
