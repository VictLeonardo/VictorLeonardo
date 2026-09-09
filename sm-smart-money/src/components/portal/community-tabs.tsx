'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

export function CommunityTabs({ active }: { active: 'forum' | 'diretorio' }) {
  const tabs = [
    { key: 'forum' as const, label: 'Fórum', href: '/comunidade' },
    { key: 'diretorio' as const, label: 'Diretório de membros', href: '/comunidade?aba=diretorio' },
  ];

  return (
    <div
      role="tablist"
      aria-label="Seção da comunidade"
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-sunken p-1"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          role="tab"
          aria-selected={active === tab.key}
          className={cn(
            'rounded-sm px-4 py-1.5 text-sm font-medium transition-colors',
            active === tab.key
              ? 'bg-surface text-text-1 shadow-card'
              : 'text-text-2 hover:text-text-1',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
