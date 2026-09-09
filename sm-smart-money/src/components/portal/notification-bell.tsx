'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Bell, Loader2 } from 'lucide-react';
import { relativeTime } from '@/lib/utils';

type Item = {
  id: string;
  readAt: string | null;
  notification: { id: string; title: string; body: string; url: string | null; sentAt: string };
};

/**
 * Sino de notificacoes in-app (G10). A lista so e' buscada quando o menu abre —
 * nao faz sentido carregar 30 registros em toda navegacao.
 */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [items, setItems] = React.useState<Item[] | null>(null);
  const [open, setOpen] = React.useState(false);
  // "Marcar todas como lidas" zera o badge na hora; o valor real volta do servidor
  // no proximo render. Derivar evita sincronizar prop -> state num efeito.
  const [dismissed, setDismissed] = React.useState(false);
  const unread = dismissed ? 0 : initialUnread;

  async function load() {
    const res = await fetch('/api/notificacoes');
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items);
  }

  async function markAllRead() {
    setDismissed(true);
    setItems((prev) => prev?.map((i) => ({ ...i, readAt: new Date().toISOString() })) ?? null);
    await fetch('/api/notificacoes', { method: 'POST' });
    router.refresh();
  }

  return (
    <DropdownMenu.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && items === null) void load();
      }}
    >
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notificações: ${unread} não lidas` : 'Notificações'}
          className="relative grid size-9 place-items-center rounded-md text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1"
        >
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[min(22rem,calc(100vw-2rem))] animate-slide-up rounded-md border border-line bg-surface-raised shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold text-text-1">Notificações</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-brand-strong hover:underline"
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items === null ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-text-3">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Carregando
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-3">
                Nenhuma notificação por aqui ainda.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-line)]">
                {items.map((item) => {
                  const content = (
                    <>
                      <div className="flex items-start gap-2">
                        {!item.readAt ? (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand"
                          />
                        ) : (
                          <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-1">{item.notification.title}</p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-text-2">
                            {item.notification.body}
                          </p>
                          <p className="mt-1 text-[11px] text-text-3">
                            {relativeTime(item.notification.sentAt)}
                          </p>
                        </div>
                      </div>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {item.notification.url ? (
                        <Link
                          href={item.notification.url}
                          className="block px-4 py-3 transition-colors hover:bg-surface-sunken"
                          onClick={() => setOpen(false)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="px-4 py-3">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
