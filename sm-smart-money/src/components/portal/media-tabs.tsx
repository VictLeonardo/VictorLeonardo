'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';

/** Tabs Videos | Podcasts como links: cada aba tem URL propria e e' compartilhavel. */
export function MediaTabs({ active }: { active: 'videos' | 'podcasts' }) {
  const tabs = [
    { key: 'videos' as const, label: 'Vídeos', href: '/midia' },
    { key: 'podcasts' as const, label: 'Podcasts', href: '/midia?tipo=podcasts' },
  ];

  return (
    <div
      role="tablist"
      aria-label="Tipo de mídia"
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
