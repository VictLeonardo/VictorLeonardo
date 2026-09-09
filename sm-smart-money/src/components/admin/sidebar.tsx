'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  FileStack,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  ScrollText,
  Settings,
  Users,
  Video,
  X,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { MemberAvatar } from '@/components/ui/avatar';
import { isActivePath } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import type { SessionUser } from '@/lib/auth/session';

const ADMIN_NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/membros', label: 'Membros', icon: Users },
  { href: '/admin/conteudo', label: 'Conteúdo', icon: FileStack },
  { href: '/admin/palestras', label: 'Palestras', icon: Video },
  { href: '/admin/diagnosticos', label: 'Diagnósticos', icon: BarChart3 },
  { href: '/admin/notificacoes', label: 'Notificações', icon: Bell },
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/admin/auditoria', label: 'Auditoria', icon: ScrollText },
  { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
];

/**
 * Navegacao do admin. No mobile vira uma gaveta (G13) — o painel atual nao e'
 * usavel em telas pequenas e o gestor precisa consultar KPIs fora do escritorio.
 */
export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [drawerPath, setDrawerPath] = React.useState(pathname);

  // Navegou com a gaveta aberta: fecha durante o render, sem efeito nem
  // renderizacao extra em cascata.
  if (drawerPath !== pathname) {
    setDrawerPath(pathname);
    if (open) setOpen(false);
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  const nav = (
    <nav aria-label="Navegação administrativa" className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {ADMIN_NAV.map((item) => {
          const active = item.exact ? pathname === item.href : isActivePath(pathname, item.href);
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
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        <div className="border-b border-line px-5 py-5">
          <Link href="/admin" className="inline-block rounded">
            <Logo />
          </Link>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-strong">
            Painel administrativo
          </p>
        </div>
        {nav}
        <div className="border-t border-line p-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center rounded-md border border-line-strong px-3 py-2 text-sm text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1"
          >
            Ver como membro
          </Link>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-4">
              <Logo compact />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar menu"
                className="grid size-9 place-items-center rounded-md text-text-2 hover:bg-surface-sunken"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Abrir menu"
                className="grid size-9 place-items-center rounded-md text-text-2 transition-colors hover:bg-surface-sunken lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <Logo compact className="lg:hidden" />
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle className="hidden sm:inline-flex" />
              <div className="flex items-center gap-2">
                <MemberAvatar name={user.name} src={user.avatarUrl} size={32} />
                <span className="hidden text-sm text-text-2 sm:block">{user.name}</span>
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sair"
                className="grid size-9 place-items-center rounded-md text-text-2 transition-colors hover:bg-surface-sunken hover:text-danger"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main id="conteudo-principal" className="flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
