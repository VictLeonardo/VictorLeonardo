import { requireAdmin } from '@/lib/auth/guards';
import { AdminShell } from '@/components/admin/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin('/admin');
  return <AdminShell user={user}>{children}</AdminShell>;
}
