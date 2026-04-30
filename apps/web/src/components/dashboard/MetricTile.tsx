/**
 * MetricTile — compact stat tile dengan label, big number, optional caption.
 * Reused di F8 manager dashboard + future productivity dashboard summary.
 */
import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'positive' | 'warning' | 'critical';

const TONE_CLASS: Record<Tone, string> = {
  neutral:  'border-border bg-surface',
  positive: 'border-feedback-success-border bg-feedback-success-bg',
  warning:  'border-feedback-warning-border bg-feedback-warning-bg',
  critical: 'border-feedback-danger-border bg-feedback-danger-bg',
};

const VALUE_CLASS: Record<Tone, string> = {
  neutral:  'text-foreground',
  positive: 'text-feedback-success',
  warning:  'text-feedback-warning',
  critical: 'text-feedback-danger',
};

interface MetricTileProps {
  label: string;
  value: string | number;
  caption?: string;
  tone?: Tone;
  className?: string;
}

export function MetricTile({
  label,
  value,
  caption,
  tone = 'neutral',
  className,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        'border rounded-md p-4 flex flex-col gap-1',
        TONE_CLASS[tone],
        className,
      )}
    >
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className={cn('text-3xl font-semibold leading-tight', VALUE_CLASS[tone])}>
        {value}
      </span>
      {caption && (
        <span className="text-xs text-muted-foreground mt-0.5">{caption}</span>
      )}
    </div>
  );
}
