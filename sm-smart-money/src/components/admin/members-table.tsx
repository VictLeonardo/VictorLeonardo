'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MemberStatus, Plan, Tier } from '@prisma/client';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from 'lucide-react';
import { MemberAvatar } from '@/components/ui/avatar';
import { PlanBadge, StatusBadge, TierBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { PLAN_LABELS, STATUS_LABELS, TIER_LABELS } from '@/lib/domain';
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

/**
 * Quatro colunas, nao oito.
 *
 * Com oito, a tabela media 1296px e sobrava rolagem lateral ate' num monitor de
 * 1440px -- num notebook de 1280px tres colunas ficavam fora da tela, entre elas
 * a do link de abrir o membro. E o que sobrava vinha mal: o e-mail quebrava em
 * duas linhas, o telefone em tres.
 *
 * O que saiu nao se perdeu. Contato junta e-mail e WhatsApp, Situacao junta
 * plano, status e nivel, e o resto -- perfil publico, ultimo login e os campos
 * editaveis -- abre na propria linha, para quem quiser aquele membro.
 */
const COLUMNS = [
  { key: 'name', label: 'Membro', sortable: true },
  { key: 'email', label: 'Contato', sortable: true },
  { key: 'status', label: 'Situação', sortable: true },
  { key: 'joinedAt', label: 'Entrada', sortable: true },
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
  // Varias linhas abertas ao mesmo tempo: comparar dois membros e' justamente o
  // que se faz numa lista, e fechar uma para abrir a outra atrapalharia isso.
  const [abertos, setAbertos] = React.useState<Set<string>>(() => new Set());

  function alternar(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (!proximo.delete(id)) proximo.add(id);
      return proximo;
    });
  }

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
        <table className="w-full text-left text-sm">
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
              <th scope="col" className="w-12 px-4 py-3">
                <span className="sr-only">Detalhar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const aberto = abertos.has(row.id);
              return (
                <React.Fragment key={row.id}>
                  <tr
                    onClick={() => alternar(row.id)}
                    className={cn(
                      'cursor-pointer border-b border-line transition-colors hover:bg-surface-sunken',
                      aberto && 'bg-surface-sunken',
                      busy === row.id && 'opacity-60',
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <MemberAvatar name={row.name} src={row.profile?.avatarUrl} size={34} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text-1">{row.name}</p>
                          <p className="truncate text-xs text-text-3">
                            {row.jobTitle ?? '—'}
                            {row.company ? ` · ${row.company}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* E-mail e telefone numa coluna so'. Ambos sao identidade de
                        contato, e separados gastavam largura que faltava depois:
                        o telefone chegava a quebrar em tres linhas. */}
                    <td className="max-w-[18rem] px-4 py-3">
                      <p className="truncate text-text-2" title={row.email}>
                        {row.email}
                      </p>
                      <p className="whitespace-nowrap text-xs tabular-nums text-text-3">
                        {formatPhone(row.phone)}
                      </p>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={row.status} />
                        <PlanBadge plan={row.plan} />
                        <TierBadge tier={row.tier} />
                        {row.isPartner ? <Badge tone="brand">SM Partner</Badge> : null}
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-text-2">
                      {formatDate(row.joinedAt)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          alternar(row.id);
                        }}
                        aria-expanded={aberto}
                        aria-controls={`membro-${row.id}`}
                        aria-label={`${aberto ? 'Fechar' : 'Abrir'} detalhes de ${row.name}`}
                        className="rounded p-1 text-text-3 transition-colors hover:bg-surface hover:text-text-1"
                      >
                        <ChevronDown
                          className={cn('size-4 transition-transform', aberto && 'rotate-180')}
                          aria-hidden="true"
                        />
                      </button>
                    </td>
                  </tr>

                  {aberto ? (
                    <tr id={`membro-${row.id}`} className="border-b border-line bg-surface-sunken">
                      <td colSpan={COLUMNS.length + 1} className="px-4 pb-4 pt-1">
                        <div className="flex flex-wrap items-end gap-4">
                          {/* Os campos que o admin mais mexe continuam editáveis
                              da lista; so' deixaram de ocupar a tela inteira o
                              tempo todo, em cinquenta selects desenhados de uma
                              vez para linhas que ninguem ia tocar. */}
                          <label className="flex flex-col gap-1 text-xs text-text-3">
                            Plano
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
                          </label>

                          <label className="flex flex-col gap-1 text-xs text-text-3">
                            Status
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
                          </label>

                          <label className="flex flex-col gap-1 text-xs text-text-3">
                            Nível de acesso
                            <Select
                              value={row.tier}
                              onChange={(e) => void patch(row.id, { tier: e.target.value })}
                              aria-label={`Nível de acesso de ${row.name}`}
                              className="h-8 w-32 text-xs"
                            >
                              {Object.entries(TIER_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
                                </option>
                              ))}
                            </Select>
                          </label>

                          {/* Repete o e-mail de proposito: na linha fechada ele
                              trunca para a tabela caber, e truncado nao se le'
                              nem se copia. Aqui vem inteiro. */}
                          <div className="flex flex-col gap-1 text-xs text-text-3">
                            E-mail
                            <span className="flex h-8 items-center select-all text-text-2">
                              {row.email}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1 text-xs text-text-3">
                            Perfil público
                            <span className="flex h-8 items-center">
                              {row.profile ? (
                                row.profile.isPublic ? (
                                  <Link
                                    href={`/${row.profile.slug}`}
                                    target="_blank"
                                    className="text-xs text-brand-strong hover:underline"
                                  >
                                    /{row.profile.slug}
                                  </Link>
                                ) : (
                                  <Badge tone="neutral">Privado</Badge>
                                )
                              ) : (
                                <Badge tone="warning">Sem perfil</Badge>
                              )}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1 text-xs text-text-3">
                            Último acesso
                            <span className="flex h-8 items-center tabular-nums text-text-2">
                              {row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Nunca entrou'}
                            </span>
                          </div>

                          <Link
                            href={`/admin/membros/${row.id}`}
                            className="ml-auto flex h-8 items-center text-xs font-medium text-brand-strong hover:underline"
                          >
                            Abrir ficha completa
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
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
