'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, CreditCard, ExternalLink, LogOut, ShieldCheck, User } from 'lucide-react';
import { MemberAvatar } from '@/components/ui/avatar';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationBell } from './notification-bell';
import type { SessionUser } from '@/lib/auth/session';

export function PortalHeader({
  user,
  unreadCount,
}: {
  user: SessionUser;
  unreadCount: number;
}) {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/dashboard" className="rounded lg:hidden">
          <Logo compact />
        </Link>
        <div className="hidden lg:block" />

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          <NotificationBell initialUnread={unreadCount} />

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                type="button"
                aria-label="Menu do perfil"
                className="rounded-full ring-offset-2 ring-offset-canvas transition hover:opacity-85"
              >
                <MemberAvatar name={user.name} src={user.avatarUrl} size={36} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 w-60 animate-slide-up rounded-md border border-line bg-surface-raised p-1.5 shadow-pop"
              >
                <div className="px-2.5 py-2">
                  <p className="truncate text-sm font-medium text-text-1">{user.name}</p>
                  <p className="truncate text-xs text-text-3">{user.email}</p>
                </div>
                <DropdownMenu.Separator className="my-1 h-px bg-line" />

                <DropdownMenu.Item asChild>
                  <Link
                    href="/perfil"
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text-2 outline-none data-[highlighted]:bg-surface-sunken data-[highlighted]:text-text-1"
                  >
                    <User className="size-4" aria-hidden="true" />
                    Meu perfil
                  </Link>
                </DropdownMenu.Item>

                <DropdownMenu.Item asChild>
                  <Link
                    href="/assinatura"
                    className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text-2 outline-none data-[highlighted]:bg-surface-sunken data-[highlighted]:text-text-1"
                  >
                    <CreditCard className="size-4" aria-hidden="true" />
                    Minha assinatura
                  </Link>
                </DropdownMenu.Item>

                {user.profileSlug && user.profilePublic ? (
                  <DropdownMenu.Item asChild>
                    <Link
                      href={`/${user.profileSlug}`}
                      target="_blank"
                      className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text-2 outline-none data-[highlighted]:bg-surface-sunken data-[highlighted]:text-text-1"
                    >
                      <ExternalLink className="size-4" aria-hidden="true" />
                      Ver perfil público
                    </Link>
                  </DropdownMenu.Item>
                ) : null}

                {user.role === 'ADMIN' ? (
                  <DropdownMenu.Item asChild>
                    <Link
                      href="/admin"
                      className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-text-2 outline-none data-[highlighted]:bg-surface-sunken data-[highlighted]:text-text-1"
                    >
                      <ShieldCheck className="size-4" aria-hidden="true" />
                      Painel administrativo
                    </Link>
                  </DropdownMenu.Item>
                ) : null}

                <DropdownMenu.Separator className="my-1 h-px bg-line" />
                <DropdownMenu.Item
                  onSelect={() => void signOut()}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm text-danger outline-none data-[highlighted]:bg-danger/10"
                >
                  <LogOut className="size-4" aria-hidden="true" />
                  Sair
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}

export { Bell };
