'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { PLAN_LABELS } from '@/lib/domain';

type Audience = 'TODOS' | 'POR_PLANO' | 'VIP';

const AUDIENCE_LABEL: Record<Audience, string> = {
  TODOS: 'Todos os membros ativos',
  POR_PLANO: 'Segmento por plano',
  VIP: 'Somente membros VIP',
};

/** Notificacao in-app para os membros (G10), com preview antes do disparo. */
export function NotificationComposer() {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [audience, setAudience] = React.useState<Audience>('TODOS');
  const [planFilter, setPlanFilter] = React.useState('PADRAO');
  const [scheduledFor, setScheduledFor] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const valid = title.trim().length >= 4 && body.trim().length >= 10;

  async function submit() {
    setPending(true);
    const res = await fetch('/api/admin/notificacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        body,
        url,
        audience,
        planFilter: audience === 'POR_PLANO' ? planFilter : undefined,
        scheduledFor,
        sendNow: !scheduledFor,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);
    setConfirmOpen(false);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível criar a notificação', 'error');
      return;
    }

    toast(
      scheduledFor
        ? 'Notificação agendada'
        : `Notificação enviada para ${payload.recipients} membros`,
      'success',
    );
    setTitle('');
    setBody('');
    setUrl('');
    setScheduledFor('');
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
          <Bell className="size-4 text-brand-strong" aria-hidden="true" />
          Nova notificação in-app
        </h2>

        <Field label="Título" htmlFor="notif-title" required>
          <Input
            id="notif-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Ex.: Nova palestra confirmada"
          />
        </Field>

        <Field label="Mensagem" htmlFor="notif-body" required>
          <Textarea
            id="notif-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </Field>

        <Field
          label="Link (opcional)"
          htmlFor="notif-url"
          hint="Caminho interno do portal, como /palestras/nome-da-sessao."
        >
          <Input
            id="notif-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/palestras/..."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Público" htmlFor="notif-audience" required>
            <Select
              id="notif-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value as Audience)}
            >
              {Object.entries(AUDIENCE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          {audience === 'POR_PLANO' ? (
            <Field label="Plano" htmlFor="notif-plan" required>
              <Select
                id="notif-plan"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
              >
                {Object.entries(PLAN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field
            label="Agendar envio"
            htmlFor="notif-schedule"
            hint="Vazio envia imediatamente."
            className={audience === 'POR_PLANO' ? 'sm:col-span-2' : ''}
          >
            <Input
              id="notif-schedule"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </Field>
        </div>

        <Button onClick={() => setConfirmOpen(true)} disabled={!valid} className="w-full">
          {scheduledFor ? 'Agendar notificação' : 'Revisar e enviar'}
        </Button>

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={scheduledFor ? 'Agendar esta notificação?' : 'Enviar para todos agora?'}
          description={
            scheduledFor
              ? 'A notificação será materializada na data marcada, para quem estiver ativo naquele momento.'
              : `Sera entregue imediatamente para: ${AUDIENCE_LABEL[audience].toLowerCase()}${
                  audience === 'POR_PLANO'
                    ? ` (${PLAN_LABELS[planFilter as keyof typeof PLAN_LABELS]})`
                    : ''
                }.`
          }
          confirmLabel={scheduledFor ? 'Agendar' : 'Enviar agora'}
          tone="primary"
          loading={pending}
          onConfirm={submit}
        >
          {/* Preview do que o membro vai ver no sino. */}
          <div className="rounded-md border border-line bg-surface p-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
              Prévia no sino de notificações
            </p>
            <div className="mt-2 flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
              <div>
                <p className="text-sm font-medium text-text-1">{title || 'Título da notificação'}</p>
                <p className="mt-0.5 text-xs text-text-2">{body || 'Mensagem...'}</p>
                <p className="mt-1 text-[11px] text-text-3">agora</p>
              </div>
            </div>
          </div>
          {pending ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-text-3">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Materializando destinatários...
            </p>
          ) : null}
        </ConfirmDialog>
      </CardContent>
    </Card>
  );
}
