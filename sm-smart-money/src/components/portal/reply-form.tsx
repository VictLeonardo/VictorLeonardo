'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export function ReplyForm({ topicId }: { topicId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [value, setValue] = React.useState('');
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);

    const res = await fetch(`/api/comunidade/topicos/${topicId}/respostas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: value }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível responder', 'error');
      return;
    }

    setValue('');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        maxLength={5000}
        required
        placeholder="Escreva sua resposta"
        aria-label="Sua resposta"
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending || value.trim().length < 2}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          Responder
        </Button>
      </div>
    </form>
  );
}
