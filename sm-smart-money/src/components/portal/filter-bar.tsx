'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Select } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type FilterGroup = {
  param: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

/**
 * Uma unica linha de filtros acima do conteudo que ela controla. O estado vive na
 * URL, entao filtro aplicado e' compartilhavel, sobrevive ao refresh e o botao
 * "voltar" do navegador funciona como o usuario espera.
 */
export function FilterBar({
  basePath,
  groups,
  searchParam,
  searchPlaceholder = 'Buscar...',
  className,
}: {
  basePath: string;
  groups: FilterGroup[];
  searchParam?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [term, setTerm] = React.useState(searchParam ? (params.get(searchParam) ?? '') : '');

  const buildUrl = React.useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      // Qualquer mudanca de filtro reinicia a paginacao.
      next.delete('pagina');
      const query = next.toString();
      return query ? `${basePath || pathname}?${query}` : basePath || pathname;
    },
    [basePath, params, pathname],
  );

  // Debounce na busca: um request por pausa de digitacao, nao por tecla.
  React.useEffect(() => {
    if (!searchParam) return;
    const current = params.get(searchParam) ?? '';
    if (term === current) return;
    const id = setTimeout(() => router.replace(buildUrl({ [searchParam]: term })), 350);
    return () => clearTimeout(id);
  }, [term, searchParam, params, router, buildUrl]);

  const hasFilters =
    groups.some((g) => g.value) || (searchParam ? Boolean(params.get(searchParam)) : false);

  return (
    <div className={cn('flex flex-wrap items-end gap-3', className)}>
      {searchParam ? (
        <div className="relative min-w-56 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-3"
            aria-hidden="true"
          />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-10 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-sm text-text-1 placeholder:text-text-3 focus:border-brand"
          />
        </div>
      ) : null}

      {groups.map((group) => (
        <label key={group.param} className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-3">{group.label}</span>
          <Select
            value={group.value}
            onChange={(e) => router.push(buildUrl({ [group.param]: e.target.value }))}
            className="min-w-40"
          >
            {group.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
      ))}

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setTerm('');
            router.push(basePath);
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1"
        >
          <X className="size-4" aria-hidden="true" />
          Limpar
        </button>
      ) : null}
    </div>
  );
}
