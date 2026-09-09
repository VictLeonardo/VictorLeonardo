'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Pagination({
  page,
  pageSize,
  total,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  if (pages <= 1) return null;

  const go = (next: number) => {
    const search = new URLSearchParams(params.toString());
    if (next <= 1) search.delete('pagina');
    else search.set('pagina', String(next));
    const query = search.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav
      aria-label="Paginação"
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
    >
      <p className="text-sm text-text-2">
        <span className="tabular-nums">
          {from}–{to}
        </span>{' '}
        de <span className="tabular-nums">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-line-strong px-3 text-sm text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1 disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </button>
        <span className="px-2 text-sm tabular-nums text-text-2">
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= pages}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-line-strong px-3 text-sm text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1 disabled:pointer-events-none disabled:opacity-40"
        >
          Próxima
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
