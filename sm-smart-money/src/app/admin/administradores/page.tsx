import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { listarAdministradores, membrosPromoviveis } from '@/server/admins';
import { SectionHeader } from '@/components/ui/section-header';
import { AdminList } from '@/components/admin/admin-list';

export const metadata: Metadata = { title: 'Administradores' };
export const dynamic = 'force-dynamic';

export default async function AdminAdministradoresPage() {
  const admin = await requireAdmin('/admin/administradores');

  const [administradores, membros] = await Promise.all([
    listarAdministradores(),
    membrosPromoviveis(),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Acesso"
        title="Administradores"
        description="Quem pode entrar neste painel. Contas administrativas não aparecem na lista de membros."
      />

      <AdminList
        atual={admin.id}
        administradores={administradores.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          desde: a.createdAt.toISOString(),
          ultimoLogin: a.lastLoginAt?.toISOString() ?? null,
        }))}
        membros={membros}
      />
    </div>
  );
}
