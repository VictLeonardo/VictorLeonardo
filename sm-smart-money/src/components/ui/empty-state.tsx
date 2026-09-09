import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line-strong bg-surface-sunken px-6 py-14 text-center',
        className,
      )}
    >
      {Icon ? <Icon className="size-7 text-text-3" aria-hidden="true" /> : null}
      <div className="space-y-1">
        <p className="font-medium text-text-1">{title}</p>
        {description ? <p className="mx-auto max-w-md text-sm text-text-2">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
