'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, ShieldMinus, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import { STATUS_LABELS } from '@/lib/domain';
import type { MemberStatus } from '@prisma/client';

type Administrador = {
  id: string;
  name: string;
  email: string;
  desde: string;
  ultimoLogin: string | null;
};

type Membro = { id: string; name: string; email: string; status: MemberStatus };

/**
 * Quem administra a plataforma, e como entra e sai desse papel.
 *
 * O rebaixamento passa por confirmacao porque tira acesso de uma pessoa de
 * verdade, e o texto diz o que ela conserva -- continua membro, nao perde a
 * conta. As duas travas de seguranca vivem no servidor; aqui os botoes apenas
 * refletem o que ja' seria recusado, para o admin nao descobrir por erro.
 */
export function AdminList({
  atual,
  administradores,
  membros,
}: {
  atual: string;
  administradores: Administrador[];
  membros: Membro[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [promovendo, setPromovendo] = React.useState('');
  const [pendente, setPendente] = React.useState<string | null>(null);
  const [aRebaixar, setARebaixar] = React.useState<Administrador | null>(null);

  const ultimo = administradores.length <= 1;

  async function promover() {
    if (!promovendo) return;
    setPendente('promover');
    const res = await fetch('/api/admin/administradores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: promovendo }),
    });
    const payload = await res.json().catch(() => ({}));
    setPendente(null);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível promover', 'error');
      return;
    }
    toast('Membro promovido a administrador.', 'success');
    setPromovendo('');
    router.refresh();
  }

  async function rebaixar(alvo: Administrador) {
    setPendente(alvo.id);
    const res = await fetch(`/api/admin/administradores/${alvo.id}`, { method: 'DELETE' });
    const payload = await res.json().catch(() => ({}));
    setPendente(null);
    setARebaixar(null);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível rebaixar', 'error');
      return;
    }
    toast(`${alvo.name} voltou a ser membro.`, 'success');
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-3 xl:items-start">
      <Card className="xl:col-span-2">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
              <ShieldCheck className="size-4 text-brand-strong" aria-hidden="true" />
              Com acesso administrativo
            </h2>
            <Badge tone="neutral">
              {administradores.length} {administradores.length === 1 ? 'conta' : 'contas'}
            </Badge>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-text-3">
                  <th scope="col" className="py-2 pr-4 font-medium">Nome</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Desde</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Último acesso</th>
                  <th scope="col" className="py-2 text-right font-medium">Ação</th>
                </tr>
              </thead>
              <tbody>
                {administradores.map((item) => (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-text-1">
                        {item.name}
                        {item.id === atual ? (
                          <span className="ml-2 text-xs font-normal text-text-3">(você)</span>
                        ) : null}
                      </p>
                      <p className="break-all text-xs text-text-3">{item.email}</p>
                    </td>
                    <td className="py-3 pr-4 tabular-nums text-text-2">{formatDate(item.desde)}</td>
                    <td className="py-3 pr-4 tabular-nums text-text-2">
                      {item.ultimoLogin ? formatDate(item.ultimoLogin, true) : 'nunca entrou'}
                    </td>
                    <td className="py-3 text-right">
                      {item.id === atual ? (
                        <span className="text-xs text-text-3">—</span>
                      ) : (
                        <Button
                          variant="ghost"
                          onClick={() => setARebaixar(item)}
                          disabled={pendente !== null || ultimo}
                          className="text-danger hover:bg-danger/10"
                        >
                          {pendente === item.id ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <ShieldMinus className="size-4" aria-hidden="true" />
                          )}
                          Rebaixar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {ultimo ? (
            <p className="mt-3 text-xs leading-relaxed text-text-3">
              Esta é a única conta administrativa. Promova outra antes de rebaixá-la — sem nenhum
              administrador, a plataforma só volta a ser administrável por comando no banco.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
            <UserPlus className="size-4 text-brand-strong" aria-hidden="true" />
            Promover um membro
          </h2>

          {membros.length === 0 ? (
            <p className="text-sm text-text-2">Nenhum membro cadastrado para promover.</p>
          ) : (
            <>
              <Field label="Membro" htmlFor="promover-membro">
                <Select
                  id="promover-membro"
                  value={promovendo}
                  onChange={(e) => setPromovendo(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {membros.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} · {m.email}
                      {m.status !== 'ATIVO' ? ` · ${STATUS_LABELS[m.status]}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>

              <p className="text-xs leading-relaxed text-text-3">
                Administrador vê os dados de todos os membros, dispara e-mails em massa e acessa a
                cobrança. A promoção fica registrada na auditoria.
              </p>

              <Button
                onClick={() => void promover()}
                disabled={!promovendo || pendente !== null}
                className="w-full"
              >
                {pendente === 'promover' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="size-4" aria-hidden="true" />
                )}
                Promover a administrador
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={aRebaixar !== null}
        onOpenChange={(aberto) => !aberto && setARebaixar(null)}
        title={`Rebaixar ${aRebaixar?.name ?? ''}?`}
        description="A conta continua existindo como membro, com o mesmo acesso ao portal — o que ela perde é o painel administrativo. As sessões abertas são encerradas na hora."
        confirmLabel="Rebaixar a membro"
        cancelLabel="Manter administrador"
        loading={pendente !== null && pendente !== 'promover'}
        onConfirm={() => (aRebaixar ? rebaixar(aRebaixar) : undefined)}
      />
    </div>
  );
}
