import type { Metadata } from 'next';
import type { MemberStatus, Plan } from '@prisma/client';
import { requireAdmin } from '@/lib/auth/guards';
import { listMembers } from '@/server/members';
import { SectionHeader } from '@/components/ui/section-header';
import { MemberFiltersBar } from '@/components/admin/member-filters';
import { MembersTable } from '@/components/admin/members-table';
import { NewMemberButton } from '@/components/admin/new-member';

export const metadata: Metadata = { title: 'Membros' };
export const dynamic = 'force-dynamic';

const PLANS: Plan[] = ['PADRAO', 'COM_DESCONTO', 'CORTESIA'];
const STATUSES: MemberStatus[] = ['ATIVO', 'CANCELADO', 'PENDENTE'];

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin('/admin/membros');
  const params = await searchParams;

  const filters = {
    search: params.q,
    plan: PLANS.includes(params.plano as Plan) ? (params.plano as Plan) : undefined,
    status: STATUSES.includes(params.status as MemberStatus)
      ? (params.status as MemberStatus)
      : undefined,
    profile: (['ativo', 'privado', 'sem'] as const).includes(
      params.perfil as 'ativo' | 'privado' | 'sem',
    )
      ? (params.perfil as 'ativo' | 'privado' | 'sem')
      : undefined,
    from: params.de,
    to: params.ate,
    sort: params.ordenar,
    direction: params.direcao === 'asc' ? ('asc' as const) : ('desc' as const),
    page: Number(params.pagina ?? '1') || 1,
  };

  const result = await listMembers(filters);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Gestão"
        title="Membros"
        description="Cadastro completo da comunidade, com filtros, ordenação e exportação."
        actions={<NewMemberButton />}
      >
        <MemberFiltersBar />
      </SectionHeader>

      <MembersTable
        rows={result.items.map((row) => ({
          ...row,
          joinedAt: row.joinedAt.toISOString(),
          lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
        }))}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        sort={result.sort}
        direction={result.direction}
      />
    </div>
  );
}
