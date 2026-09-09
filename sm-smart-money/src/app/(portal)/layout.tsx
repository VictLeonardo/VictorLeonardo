import { requireActiveMember } from '@/lib/auth/guards';
import { PortalBottomNav, PortalSidebar } from '@/components/portal/sidebar';
import { PortalHeader } from '@/components/portal/header';
import { countUnread } from '@/server/notifications';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireActiveMember();
  const unread = await countUnread(user.id);

  return (
    <div className="flex min-h-dvh">
      <PortalSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <PortalHeader user={user} unreadCount={unread} />
        <main
          id="conteudo-principal"
          className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:pb-12 lg:pt-8"
        >
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <PortalBottomNav />
      </div>
    </div>
  );
}
