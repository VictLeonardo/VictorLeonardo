'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Search, X } from 'lucide-react';
import { Input, Select } from '@/components/ui/input';
import { PLAN_LABELS, STATUS_LABELS } from '@/lib/domain';

/**
 * Filtros da tabela de membros (G05). Tudo vive na query string: o admin pode
 * salvar o link de "cancelados do último trimestre" e a exportacao CSV reaproveita
 * exatamente os mesmos parametros.
 */
export function MemberFiltersBar() {
  const router = useRouter();
  const params = useSearchParams();
  const [term, setTerm] = React.useState(params.get('q') ?? '');

  const update = React.useCallback(
    (changes: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete('pagina');
      router.push(`/admin/membros?${next.toString()}`);
    },
    [params, router],
  );

  React.useEffect(() => {
    const current = params.get('q') ?? '';
    if (term === current) return;
    const id = setTimeout(() => update({ q: term }), 350);
    return () => clearTimeout(id);
  }, [term, params, update]);

  const hasFilters = ['q', 'plano', 'status', 'perfil', 'de', 'ate'].some((key) => params.get(key));
  const exportHref = `/api/admin/membros/exportar?${params.toString()}`;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative min-w-56 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-3"
          aria-hidden="true"
        />
        <input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          aria-label="Buscar membros"
          className="h-10 w-full rounded-md border border-line-strong bg-surface pl-9 pr-3 text-sm text-text-1 placeholder:text-text-3 focus:border-brand"
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-3">Plano</span>
        <Select
          value={params.get('plano') ?? ''}
          onChange={(e) => update({ plano: e.target.value })}
          className="w-40"
        >
          <option value="">Todos</option>
          {Object.entries(PLAN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-3">Status</span>
        <Select
          value={params.get('status') ?? ''}
          onChange={(e) => update({ status: e.target.value })}
          className="w-36"
        >
          <option value="">Todos</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-3">Perfil público</span>
        <Select
          value={params.get('perfil') ?? ''}
          onChange={(e) => update({ perfil: e.target.value })}
          className="w-36"
        >
          <option value="">Todos</option>
          <option value="ativo">Ativo</option>
          <option value="privado">Privado</option>
          <option value="sem">Sem perfil</option>
        </Select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-3">Entrada de</span>
        <Input
          type="date"
          value={params.get('de') ?? ''}
          onChange={(e) => update({ de: e.target.value })}
          className="w-40"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-text-3">até</span>
        <Input
          type="date"
          value={params.get('ate') ?? ''}
          onChange={(e) => update({ ate: e.target.value })}
          className="w-40"
        />
      </label>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => {
            setTerm('');
            router.push('/admin/membros');
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-md px-2.5 text-sm text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1"
        >
          <X className="size-4" aria-hidden="true" />
          Limpar
        </button>
      ) : null}

      <a
        href={exportHref}
        className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm text-text-1 transition-colors hover:bg-surface-sunken"
      >
        <Download className="size-4" aria-hidden="true" />
        Exportar CSV
      </a>
    </div>
  );
}
