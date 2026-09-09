import { cn } from '@/lib/utils';

/** Marca da comunidade. O monograma usa a fonte display; o resto, a de corpo. */
export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-md bg-brand font-display text-base font-bold text-[var(--color-brand-contrast)]"
      >
        SM
      </span>
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className="font-display text-base font-semibold text-text-1">Smart Money</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-text-3">
            Comunidade
          </span>
        </span>
      ) : null}
    </span>
  );
}
