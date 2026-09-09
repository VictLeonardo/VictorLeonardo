'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MailPlus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

type Member = {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  slug: string | null;
  inviteSentAt: string | null;
};

type Batch = {
  batchId: string;
  sentAt: string;
  total: number;
  ok: number;
  failed: number;
  recipients: { to: string; status: string; error: string | null }[];
};

/**
 * Convites de ativacao de perfil (G06). O botao atual da plataforma dispara em
 * massa sem aviso; aqui o admin escolhe quem recebe, ve a previa do e-mail, passa
 * por uma confirmacao e encontra o historico de cada lote logo abaixo.
 */
export function InvitePanel({ members, history }: { members: Member[]; history: Batch[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = members.length > 0 && selected.size === members.length;

  async function send() {
    setPending(true);
    const res = await fetch('/api/admin/convites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [...selected] }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);
    setConfirmOpen(false);

    if (!res.ok) {
      toast(payload.error ?? 'Falha ao disparar convites', 'error');
      return;
    }

    toast(
      payload.failed > 0
        ? `${payload.sent} enviados, ${payload.failed} falharam`
        : `${payload.sent} convites enviados`,
      payload.failed > 0 ? 'info' : 'success',
    );
    setSelected(new Set());
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
            <MailPlus className="size-4 text-brand-strong" aria-hidden="true" />
            Convites de perfil público
          </h2>
          <Badge tone={members.length > 0 ? 'warning' : 'positive'}>
            {members.length} pendente{members.length === 1 ? '' : 's'}
          </Badge>
        </div>

        {members.length === 0 ? (
          <p className="text-sm text-text-2">
            Todos os membros ativos já tem perfil público ativado.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-text-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(members.map((m) => m.id)) : new Set())
                  }
                  className="size-4 rounded border-line-strong accent-[var(--color-brand-strong)]"
                />
                Selecionar todos
              </label>
              <span className="text-xs tabular-nums text-text-3">
                {selected.size} selecionado{selected.size === 1 ? '' : 's'}
              </span>
            </div>

            <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-line p-1.5">
              {members.map((member) => (
                <li key={member.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-sm p-2 transition-colors hover:bg-surface-sunken">
                    <input
                      type="checkbox"
                      checked={selected.has(member.id)}
                      onChange={() => toggle(member.id)}
                      className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-[var(--color-brand-strong)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text-1">{member.name}</span>
                      <span className="block truncate text-xs text-text-3">{member.email}</span>
                      {member.inviteSentAt ? (
                        <span className="block text-[11px] text-text-3">
                          Ultimo convite: {formatDate(member.inviteSentAt)}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={selected.size === 0}
              className="w-full"
            >
              <Send className="size-4" aria-hidden="true" />
              Disparar convites ({selected.size})
            </Button>
          </>
        )}

        {history.length > 0 ? (
          <div className="border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-text-1">Histórico de disparos</h3>
            <ul className="mt-2 space-y-2">
              {history.map((batch) => (
                <li key={batch.batchId}>
                  <details className="rounded-md border border-line px-3 py-2">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-text-1">{formatDate(batch.sentAt, true)}</span>
                      <span className="flex items-center gap-1.5">
                        <Badge tone="positive">{batch.ok} enviados</Badge>
                        {batch.failed > 0 ? <Badge tone="danger">{batch.failed} falhas</Badge> : null}
                      </span>
                    </summary>
                    <ul className="mt-2 space-y-1 border-t border-line pt-2">
                      {batch.recipients.map((recipient) => (
                        <li
                          key={`${batch.batchId}-${recipient.to}`}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="truncate text-text-2">{recipient.to}</span>
                          <span
                            className={
                              recipient.status === 'ENVIADO'
                                ? 'shrink-0 text-positive'
                                : 'shrink-0 text-danger'
                            }
                          >
                            {recipient.status === 'ENVIADO' ? 'Enviado' : (recipient.error ?? 'Falhou')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Enviar ${selected.size} convite${selected.size === 1 ? '' : 's'}?`}
          description="Cada membro selecionado recebe o e-mail abaixo. O resultado por destinatário fica registrado no histórico."
          confirmLabel="Confirmar disparo"
          tone="primary"
          loading={pending}
          onConfirm={send}
        >
          <div className="rounded-md border border-line bg-surface p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
              Prévia do e-mail
            </p>
            <p className="mt-2 text-sm font-medium text-text-1">
              Assunto: Ative seu perfil de Membro Estratégico
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-2">
              Ola, [primeiro nome]. Cada membro da SM Smart Money tem um endereço próprio na
              comunidade — o seu já está reservado. Ative o perfil para aparecer no diretório de
              membros e compartilhar seu cartao digital.
            </p>
            <p className="mt-3 inline-block rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-contrast)]">
              Ativar meu perfil
            </p>
          </div>
        </ConfirmDialog>
      </CardContent>
    </Card>
  );
}
