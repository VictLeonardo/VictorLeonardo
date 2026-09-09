'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MemberStatus, Plan, Tier } from '@prisma/client';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { MemberAvatar } from '@/components/ui/avatar';
import { PlanBadge, StatusBadge, TierBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { PLAN_LABELS, STATUS_LABELS } from '@/lib/domain';
import { cn, formatDate, formatPhone } from '@/lib/utils';

export type MemberTableRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  company: string | null;
  plan: Plan;
  status: MemberStatus;
  tier: Tier;
  isPartner: boolean;
  joinedAt: string;
  lastLoginAt: string | null;
  profile: { slug: string; isPublic: boolean; avatarUrl: string | null } | null;
};

const COLUMNS = [
  { key: 'name', label: 'Nome + cargo', sortable: true },
  { key: 'email', label: 'E-mail', sortable: true },
  { key: 'phone', label: 'WhatsApp', sortable: false },
  { key: 'plan', label: 'Plano', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'joinedAt', label: 'Entrada', sortable: true },
  { key: 'profile', label: 'Perfil', sortable: false },
] as const;

export function MembersTable({
  rows,
  total,
  page,
  pageSize,
  sort,
  direction,
}: {
  rows: MemberTableRow[];
  total: number;
  page: number;
  pageSize: number;
  sort: string;
  direction: 'asc' | 'desc';
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.push(`/admin/membros?${next.toString()}`);
  }

  function toggleSort(key: string) {
    const nextDirection = sort === key && direction === 'desc' ? 'asc' : 'desc';
    navigate({ ordenar: key, direcao: nextDirection, pagina: '' });
  }

  /** Edicao inline de plano e status — os dois campos que o admin mais mexe. */
  async function patch(id: string, data: Record<string, string>) {
    setBusy(id);
    const res = await fetch(`/api/admin/membros/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const payload = await res.json().catch(() => ({}));
    setBusy(null);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível atualizar', 'error');
      return;
    }
    toast('Membro atualizado', 'success');
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong bg-surface-sunken px-6 py-14 text-center">
        <p className="font-medium text-text-1">Nenhum membro encontrado</p>
        <p className="mt-1 text-sm text-text-2">Ajuste os filtros ou limpe a busca.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabela em telas medias para cima; cards no mobile (G13). */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-surface shadow-card md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-text-3">
              {COLUMNS.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-3 font-medium">
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      aria-label={`Ordenar por ${column.label}`}
                      className="inline-flex items-center gap-1 transition-colors hover:text-text-1"
                    >
                      {column.label}
                      {sort === column.key ? (
                        direction === 'asc' ? (
                          <ArrowUp className="size-3" aria-hidden="true" />
                        ) : (
                          <ArrowDown className="size-3" aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-50" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b border-line last:border-0 transition-colors hover:bg-surface-sunken',
                  busy === row.id && 'opacity-60',
                )}
              >
                <td className="px-4 py-3">
                  <Link href={`/admin/membros/${row.id}`} className="flex items-center gap-3 group">
                    <MemberAvatar name={row.name} src={row.profile?.avatarUrl} size={34} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-text-1 group-hover:text-brand-strong">
                        {row.name}
                      </span>
                      <span className="block truncate text-xs text-text-3">
                        {row.jobTitle ?? '—'}
                        {row.company ? ` · ${row.company}` : ''}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-text-2">{row.email}</td>
                <td className="px-4 py-3 tabular-nums text-text-2">{formatPhone(row.phone)}</td>
                <td className="px-4 py-3">
                  <Select
                    value={row.plan}
                    onChange={(e) => void patch(row.id, { plan: e.target.value })}
                    aria-label={`Plano de ${row.name}`}
                    className="h-8 w-36 text-xs"
                  >
                    {Object.entries(PLAN_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3">
                  <Select
                    value={row.status}
                    onChange={(e) => void patch(row.id, { status: e.target.value })}
                    aria-label={`Status de ${row.name}`}
                    className="h-8 w-32 text-xs"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-4 py-3 tabular-nums text-text-2">{formatDate(row.joinedAt)}</td>
                <td className="px-4 py-3">
                  {row.profile ? (
                    row.profile.isPublic ? (
                      <Link
                        href={`/${row.profile.slug}`}
                        target="_blank"
                        className="text-xs text-brand-strong hover:underline"
                      >
                        Ativo
                      </Link>
                    ) : (
                      <Badge tone="neutral">Privado</Badge>
                    )
                  ) : (
                    <Badge tone="warning">Sem perfil</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/membros/${row.id}`}
                    className="text-xs font-medium text-brand-strong hover:underline"
                  >
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/admin/membros/${row.id}`}
              className="block rounded-lg border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex items-start gap-3">
                <MemberAvatar name={row.name} src={row.profile?.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-text-1">{row.name}</p>
                  <p className="truncate text-xs text-text-3">{row.jobTitle ?? row.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={row.status} />
                    <PlanBadge plan={row.plan} />
                    <TierBadge tier={row.tier} />
                  </div>
                  <p className="mt-2 text-xs text-text-3">
                    Entrou em {formatDate(row.joinedAt)}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      <nav aria-label="Paginação" className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-2">
          <span className="tabular-nums">
            {(page - 1) * pageSize + 1}–{Math.min(total, page * pageSize)}
          </span>{' '}
          de <span className="tabular-nums">{total}</span> membros
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate({ pagina: String(page - 1) })}
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
            onClick={() => navigate({ pagina: String(page + 1) })}
            disabled={page >= pages}
            className="inline-flex h-9 items-center gap-1 rounded-md border border-line-strong px-3 text-sm text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1 disabled:pointer-events-none disabled:opacity-40"
          >
            Próxima
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </nav>
    </div>
  );
}
