'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export function LogoutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="inline-flex items-center gap-1.5 text-sm text-text-3 transition-colors hover:text-text-1"
    >
      <LogOut className="size-4" aria-hidden="true" />
      Sair da conta
    </button>
  );
}
