'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Marcador manual de "assistido" / "lido", persistido em ContentView.completed. */
export function WatchedToggle({
  contentId,
  initial,
  labels = { on: 'Assistido', off: 'Marcar como assistido' },
}: {
  contentId: string;
  initial: boolean;
  labels?: { on: string; off: string };
}) {
  const router = useRouter();
  const [done, setDone] = React.useState(initial);
  const [pending, setPending] = React.useState(false);

  async function toggle() {
    const next = !done;
    setDone(next);
    setPending(true);
    await fetch(`/api/conteudo/${contentId}/concluido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: next }),
    }).catch(() => setDone(!next));
    setPending(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={done}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors',
        done
          ? 'border-positive/40 bg-positive/10 text-positive'
          : 'border-line-strong text-text-2 hover:bg-surface-sunken hover:text-text-1',
      )}
    >
      {done ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Circle className="size-3.5" aria-hidden="true" />
      )}
      {done ? labels.on : labels.off}
    </button>
  );
}
