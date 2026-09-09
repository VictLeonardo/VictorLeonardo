'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/confirm-dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { TOPIC_CATEGORY_LABELS } from '@/lib/domain';

export function NewTopicButton({ canPostVip }: { canPostVip: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const res = await fetch('/api/comunidade/topicos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: data.get('title'),
        body: data.get('body'),
        category: data.get('category'),
        isVip: data.get('isVip') === 'on',
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(payload.error ?? 'Não foi possível publicar o tópico');
      return;
    }

    setOpen(false);
    toast('Tópico publicado', 'success');
    router.push(`/comunidade/topico/${payload.id}`);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Novo tópico
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Abrir um tópico"
        description="Compartilhe uma dúvida, uma leitura de mercado ou uma oportunidade com a comunidade."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Título" htmlFor="title" required>
            <Input id="title" name="title" required maxLength={160} placeholder="Resuma o assunto" />
          </Field>

          <Field label="Categoria" htmlFor="category" required>
            <Select id="category" name="category" required defaultValue="INVESTIMENTOS">
              {Object.entries(TOPIC_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Conteúdo" htmlFor="body" required hint="Mínimo de 20 caracteres.">
            <Textarea id="body" name="body" required rows={7} maxLength={5000} />
          </Field>

          {canPostVip ? (
            <label className="inline-flex items-center gap-2 text-sm text-text-2">
              <input
                type="checkbox"
                name="isVip"
                className="size-4 rounded border-line-strong accent-[var(--color-brand-strong)]"
              />
              Restringir aos membros VIP
            </label>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Publicar
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
