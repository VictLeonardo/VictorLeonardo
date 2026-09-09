import {
  BarChart3,
  BookOpen,
  Compass,
  FileText,
  LayoutDashboard,
  Library,
  Users,
  Video,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  /** Aparece na bottom navigation do mobile (5 itens principais). */
  primary?: boolean;
};

export const PORTAL_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, primary: true },
  { href: '/palestras', label: 'Palestras', icon: Video, primary: true },
  { href: '/conteudo', label: 'Conteúdo Exclusivo', shortLabel: 'Conteúdo', icon: FileText, primary: true },
  { href: '/midia', label: 'Vídeos & Podcasts', shortLabel: 'Mídia', icon: Library },
  { href: '/analises', label: 'Análises de Mercado', shortLabel: 'Análises', icon: BarChart3 },
  { href: '/journey', label: 'Smart Money Journey', shortLabel: 'Journey', icon: Compass, primary: true },
  { href: '/ebooks', label: 'E-books', icon: BookOpen },
  { href: '/comunidade', label: 'Comunidade VIP', shortLabel: 'Comunidade', icon: Users, primary: true },
];

export function isActivePath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
