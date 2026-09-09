import type { MemberStatus, Plan } from '@prisma/client';
import { getSessionUser } from '@/lib/auth/session';
import { exportMembers, membersToCsv } from '@/server/members';

const PLANS: Plan[] = ['PADRAO', 'COM_DESCONTO', 'CORTESIA'];
const STATUSES: MemberStatus[] = ['ATIVO', 'CANCELADO', 'PENDENTE'];

/** CSV com exatamente os mesmos filtros aplicados na tabela. */
export async function GET(request: Request) {
  const admin = await getSessionUser();
  if (admin?.role !== 'ADMIN') return new Response('Acesso restrito', { status: 403 });

  const params = new URL(request.url).searchParams;
  const perfil = params.get('perfil');

  const rows = await exportMembers({
    search: params.get('q') ?? undefined,
    plan: PLANS.includes(params.get('plano') as Plan) ? (params.get('plano') as Plan) : undefined,
    status: STATUSES.includes(params.get('status') as MemberStatus)
      ? (params.get('status') as MemberStatus)
      : undefined,
    profile:
      perfil === 'ativo' || perfil === 'privado' || perfil === 'sem'
        ? (perfil as 'ativo' | 'privado' | 'sem')
        : undefined,
    from: params.get('de') ?? undefined,
    to: params.get('ate') ?? undefined,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(membersToCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="membros-sm-${stamp}.csv"`,
    },
  });
}
