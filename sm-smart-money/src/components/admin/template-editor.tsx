'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

type Template = {
  channel: 'EMAIL' | 'WHATSAPP';
  key: string;
  name: string;
  subject: string;
  body: string;
  updatedAt: string | null;
};

/**
 * Editor dos templates transacionais. As variaveis entre chaves sao substituidas
 * na hora do envio.
 */
export function TemplateEditor({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);

  async function save(template: Template, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = `${template.channel}:${template.key}`;
    setPendingKey(id);

    const data = new FormData(event.currentTarget);
    const res = await fetch('/api/admin/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: template.channel,
        key: template.key,
        name: template.name,
        subject: data.get('subject'),
        body: data.get('body'),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setPendingKey(null);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível salvar o template', 'error');
      return;
    }

    toast('Template salvo', 'success');
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-text-1">Templates de mensagem</h2>
        <p className="mt-1 text-sm text-text-2">
          Use <code className="font-mono text-xs">{'{{nome}}'}</code>,{' '}
          <code className="font-mono text-xs">{'{{primeiro_nome}}'}</code> e{' '}
          <code className="font-mono text-xs">{'{{link}}'}</code> como variáveis.
        </p>

        <div className="mt-4 space-y-3">
          {templates.map((template) => {
            const id = `${template.channel}:${template.key}`;
            return (
              <details key={id} className="rounded-md border border-line px-4 py-3">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-text-1">{template.name}</span>
                  <span className="text-xs text-text-3">
                    {template.channel === 'EMAIL' ? 'E-mail' : 'WhatsApp'}
                    {template.updatedAt ? ` · atualizado em ${formatDate(template.updatedAt)}` : ' · não configurado'}
                  </span>
                </summary>

                <form onSubmit={(event) => void save(template, event)} className="mt-4 space-y-3">
                  {template.channel === 'EMAIL' ? (
                    <Field label="Assunto" htmlFor={`${id}-subject`}>
                      <Input id={`${id}-subject`} name="subject" defaultValue={template.subject} />
                    </Field>
                  ) : null}

                  <Field label="Mensagem" htmlFor={`${id}-body`} required>
                    <Textarea
                      id={`${id}-body`}
                      name="body"
                      rows={6}
                      defaultValue={template.body}
                      required
                      minLength={5}
                    />
                  </Field>

                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={pendingKey === id}>
                      {pendingKey === id ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : null}
                      Salvar template
                    </Button>
                  </div>
                </form>
              </details>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
