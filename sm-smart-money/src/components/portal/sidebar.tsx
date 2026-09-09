'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PORTAL_NAV, isActivePath } from '@/lib/navigation';
import { MemberAvatar } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/lib/auth/session';

export function PortalSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="border-b border-line px-5 py-5">
        <Link href="/dashboard" className="inline-block rounded">
          <Logo />
        </Link>
      </div>

      <div className="border-b border-line px-5 py-4">
        <Link
          href="/perfil"
          className="flex items-center gap-3 rounded-md p-1 transition-colors hover:bg-surface-sunken"
        >
          <MemberAvatar name={user.name} src={user.avatarUrl} size={38} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-text-1">{user.name}</span>
            <span className="block truncate text-xs text-text-3">
              {user.jobTitle ?? 'Membro da comunidade'}
            </span>
          </span>
        </Link>
      </div>

      <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {PORTAL_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-brand-soft font-medium text-brand-strong'
                      : 'text-text-2 hover:bg-surface-sunken hover:text-text-1',
                  )}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {user.role === 'ADMIN' ? (
        <div className="border-t border-line p-3">
          <Link
            href="/admin"
            className="flex items-center justify-center rounded-md border border-line-strong px-3 py-2 text-sm text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1"
          >
            Painel administrativo
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

/** Bottom navigation do mobile: apenas as 5 secoes principais. */
export function PortalBottomNav() {
  const pathname = usePathname();
  const items = PORTAL_NAV.filter((i) => i.primary);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] transition-colors',
                  active ? 'text-brand-strong' : 'text-text-3',
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                <span className="truncate">{item.shortLabel ?? item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
