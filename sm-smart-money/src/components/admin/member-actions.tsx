'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { MemberStatus } from '@prisma/client';
import { KeyRound, Mail, MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog, Modal } from '@/components/ui/confirm-dialog';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

type Member = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: MemberStatus;
};

export function MemberActions({ member }: { member: Member }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [emailOpen, setEmailOpen] = React.useState(false);
  const [whatsappOpen, setWhatsappOpen] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [resetLink, setResetLink] = React.useState<string | null>(null);

  async function act(body: Record<string, unknown>) {
    setPending(true);
    const res = await fetch(`/api/admin/membros/${member.id}/acoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);
    return { ok: res.ok, payload } as const;
  }

  async function generateReset() {
    const { ok, payload } = await act({ action: 'reset-senha' });
    if (!ok) {
      toast(payload.error ?? 'Falha ao gerar o link', 'error');
      return;
    }
    setResetLink(payload.link);
    toast('Link de reset gerado e enviado por e-mail', 'success');
  }

  async function remove() {
    setPending(true);
    const res = await fetch(`/api/admin/membros/${member.id}`, { method: 'DELETE' });
    const payload = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível excluir', 'error');
      return;
    }
    toast('Membro excluido', 'success');
    router.push('/admin/membros');
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => setEmailOpen(true)}>
        <Mail className="size-4" aria-hidden="true" />
        E-mail
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setWhatsappOpen(true)}
        disabled={!member.phone}
        title={member.phone ? undefined : 'Membro sem WhatsApp cadastrado'}
      >
        <MessageCircle className="size-4" aria-hidden="true" />
        WhatsApp
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)}>
        <KeyRound className="size-4" aria-hidden="true" />
        Reset de senha
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)} className="text-danger">
        <Trash2 className="size-4" aria-hidden="true" />
        Excluir
      </Button>

      <Modal
        open={emailOpen}
        onOpenChange={setEmailOpen}
        title="Enviar e-mail manual"
        description={`Para ${member.email}`}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const { ok, payload } = await act({
              action: 'email',
              subject: data.get('subject'),
              message: data.get('message'),
            });
            if (!ok) {
              toast(payload.error ?? 'Falha no envio', 'error');
              return;
            }
            setEmailOpen(false);
            toast('E-mail enviado', 'success');
            router.refresh();
          }}
          className="space-y-4"
        >
          <Field label="Assunto" htmlFor="mail-subject" required>
            <Input id="mail-subject" name="subject" required minLength={3} />
          </Field>
          <Field label="Mensagem" htmlFor="mail-message" required>
            <Textarea id="mail-message" name="message" rows={6} required minLength={10} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEmailOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Enviar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={whatsappOpen}
        onOpenChange={setWhatsappOpen}
        title="Enviar mensagem no WhatsApp"
        description={`Via WAHA para ${member.phone ?? '—'}`}
      >
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const { ok, payload } = await act({ action: 'whatsapp', message: data.get('message') });
            if (!ok) {
              toast(payload.error ?? 'Falha no envio', 'error');
              return;
            }
            setWhatsappOpen(false);
            toast('Mensagem enviada', 'success');
            router.refresh();
          }}
          className="space-y-4"
        >
          <Field label="Mensagem" htmlFor="wa-message" required>
            <Textarea id="wa-message" name="message" rows={5} required minLength={2} maxLength={1000} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setWhatsappOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Enviar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={(next) => {
          setResetOpen(next);
          if (!next) setResetLink(null);
        }}
        title="Gerar link de reset de senha?"
        description={
          resetLink
            ? 'Link gerado e enviado por e-mail. Use a copia abaixo se precisar repassar por outro canal.'
            : `Um e-mail com o link será enviado para ${member.email}. O link vale por 24 horas.`
        }
        confirmLabel={resetLink ? 'Fechar' : 'Gerar e enviar'}
        tone="primary"
        loading={pending}
        onConfirm={resetLink ? () => setResetOpen(false) : generateReset}
      >
        {resetLink ? (
          <p className="break-all rounded-md bg-surface-sunken px-3 py-2 font-mono text-xs text-text-2">
            {resetLink}
          </p>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir membro definitivamente?"
        description={
          <>
            Todos os dados de <strong className="text-text-1">{member.name}</strong> serão removidos:
            perfil público, diagnósticos, tópicos e histórico de visualizações. A ação não pode ser
            desfeita. Para apenas suspender o acesso, use o status <em>Cancelado</em>.
          </>
        }
        confirmLabel="Excluir permanentemente"
        loading={pending}
        onConfirm={remove}
      />
    </div>
  );
}
