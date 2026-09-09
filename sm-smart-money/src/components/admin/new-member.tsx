'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/confirm-dialog';
import { Field, Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { PLAN_LABELS, STATUS_LABELS } from '@/lib/domain';

export function NewMemberButton() {
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
    const res = await fetch('/api/admin/membros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        email: data.get('email'),
        phone: data.get('phone'),
        jobTitle: data.get('jobTitle'),
        company: data.get('company'),
        plan: data.get('plan'),
        status: data.get('status'),
        tier: data.get('tier'),
        isPartner: data.get('isPartner') === 'on',
        sendWelcome: data.get('sendWelcome') === 'on',
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(payload.error ?? 'Não foi possível criar o membro');
      return;
    }

    setOpen(false);
    toast('Membro criado', 'success');
    router.push(`/admin/membros/${payload.id}`);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden="true" />
        Novo membro
      </Button>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Novo membro"
        description="O membro recebe um link para definir a própria senha — nenhuma senha é enviada por e-mail."
        wide
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome completo" htmlFor="new-name" required className="sm:col-span-2">
              <Input id="new-name" name="name" required minLength={3} />
            </Field>
            <Field label="E-mail" htmlFor="new-email" required>
              <Input id="new-email" name="email" type="email" required />
            </Field>
            <Field label="WhatsApp" htmlFor="new-phone" hint="Com DDD. Usado nos disparos WAHA.">
              <Input id="new-phone" name="phone" placeholder="(11) 90000-0000" />
            </Field>
            <Field label="Cargo" htmlFor="new-job">
              <Input id="new-job" name="jobTitle" />
            </Field>
            <Field label="Empresa" htmlFor="new-company">
              <Input id="new-company" name="company" />
            </Field>
            <Field label="Plano" htmlFor="new-plan" required>
              <Select id="new-plan" name="plan" defaultValue="PADRAO">
                {Object.entries(PLAN_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" htmlFor="new-status" required>
              <Select id="new-status" name="status" defaultValue="ATIVO">
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Tier de acesso"
              htmlFor="new-tier"
              hint="VIP libera conteúdos e espaços restritos."
            >
              <Select id="new-tier" name="tier" defaultValue="PADRAO">
                <option value="PADRAO">Padrão</option>
                <option value="VIP">VIP</option>
              </Select>
            </Field>
          </div>

          <div className="space-y-2 rounded-md border border-line p-3">
            <label className="flex items-center gap-2 text-sm text-text-2">
              <input
                type="checkbox"
                name="isPartner"
                className="size-4 rounded border-line-strong accent-[var(--color-brand-strong)]"
              />
              Marcar como SM Partner
            </label>
            <label className="flex items-center gap-2 text-sm text-text-2">
              <input
                type="checkbox"
                name="sendWelcome"
                defaultChecked
                className="size-4 rounded border-line-strong accent-[var(--color-brand-strong)]"
              />
              Enviar e-mail de boas-vindas com link de acesso
            </label>
          </div>

          {error ? (
            <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Criar membro
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
