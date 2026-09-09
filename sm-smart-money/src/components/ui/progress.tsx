import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  max = 100,
  label,
  className,
  tone = 'brand',
}: {
  value: number;
  max?: number;
  label?: string;
  className?: string;
  tone?: 'brand' | 'positive' | 'warning' | 'danger';
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const toneClass = {
    brand: 'bg-brand',
    positive: 'bg-positive',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-sunken', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', toneClass)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
