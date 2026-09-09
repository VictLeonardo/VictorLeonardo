'use client';

import * as React from 'react';
import { Check, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

/**
 * Compartilhamento interno: copia o link do portal para outro membro. Nao ha'
 * compartilhamento externo — o conteudo e' restrito a comunidade.
 */
export function ShareButton({ path, label = 'Copiar link' }: { path: string; label?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast('Link copiado. Compartilhe com outro membro.', 'success');
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast('Não foi possível copiar o link', 'error');
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-xs text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1"
    >
      {copied ? (
        <Check className="size-3.5 text-positive" aria-hidden="true" />
      ) : (
        <Link2 className="size-3.5" aria-hidden="true" />
      )}
      {copied ? 'Copiado' : label}
    </button>
  );
}
