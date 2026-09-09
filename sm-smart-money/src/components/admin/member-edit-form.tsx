'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { MemberStatus, Plan, Tier } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { PLAN_LABELS, STATUS_LABELS } from '@/lib/domain';

export function MemberEditForm({
  member,
}: {
  member: {
    id: string;
    name: string;
    phone: string | null;
    jobTitle: string | null;
    company: string | null;
    plan: Plan;
    status: MemberStatus;
    tier: Tier;
    isPartner: boolean;
  };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<MemberStatus>(member.status);
  const [pending, setPending] = React.useState(false);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  async function save() {
    const form = formRef.current;
    if (!form) return;

    setPending(true);
    const data = new FormData(form);
    const res = await fetch(`/api/admin/membros/${member.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        phone: data.get('phone'),
        jobTitle: data.get('jobTitle'),
        company: data.get('company'),
        plan: data.get('plan'),
        status,
        tier: data.get('tier'),
        isPartner: data.get('isPartner') === 'on',
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);
    setConfirmCancel(false);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível salvar', 'error');
      return;
    }

    toast('Dados atualizados', 'success');
    router.refresh();
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Cancelar corta o acesso na hora — passa pela confirmacao explicita.
    if (status === 'CANCELADO' && member.status !== 'CANCELADO') {
      setConfirmCancel(true);
      return;
    }
    void save();
  }

  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold text-text-1">Dados do membro</h2>

        <form ref={formRef} onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" htmlFor="edit-name" required className="sm:col-span-2">
              <Input id="edit-name" name="name" defaultValue={member.name} required />
            </Field>
            <Field label="Cargo" htmlFor="edit-job">
              <Input id="edit-job" name="jobTitle" defaultValue={member.jobTitle ?? ''} />
            </Field>
            <Field label="Empresa" htmlFor="edit-company">
              <Input id="edit-company" name="company" defaultValue={member.company ?? ''} />
            </Field>
            <Field label="WhatsApp" htmlFor="edit-phone">
              <Input id="edit-phone" name="phone" defaultValue={member.phone ?? ''} />
            </Field>
            <Field label="Plano" htmlFor="edit-plan">
              <Select id="edit-plan" name="plan" defaultValue={member.plan}>
                {Object.entries(PLAN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="edit-status">
              <Select
                id="edit-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as MemberStatus)}
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tier de acesso" htmlFor="edit-tier">
              <Select id="edit-tier" name="tier" defaultValue={member.tier}>
                <option value="PADRAO">Padrão</option>
                <option value="VIP">VIP</option>
              </Select>
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-2">
            <input
              type="checkbox"
              name="isPartner"
              defaultChecked={member.isPartner}
              className="size-4 rounded border-line-strong accent-[var(--color-brand-strong)]"
            />
            SM Partner
          </label>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Salvar alteracoes
            </Button>
          </div>
        </form>

        <ConfirmDialog
          open={confirmCancel}
          onOpenChange={setConfirmCancel}
          title="Cancelar este membro?"
          description={
            <>
              <strong className="text-text-1">{member.name}</strong> perde o acesso ao conteúdo
              imediatamente e todas as sessões ativas são encerradas. O perfil público e o histórico
              são preservados, e o status pode ser revertido depois.
            </>
          }
          confirmLabel="Cancelar membro"
          cancelLabel="Voltar"
          loading={pending}
          onConfirm={save}
        />
      </CardContent>
    </Card>
  );
}
