'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

export type Destinatario = {
  id: string;
  name: string;
  email: string;
  /** Linha de contexto sob o e-mail, como a data do ultimo envio. */
  nota?: string | null;
};

export type LoteEnviado = {
  batchId: string;
  sentAt: string;
  total: number;
  ok: number;
  failed: number;
  recipients: { to: string; status: string; error: string | null }[];
};

/**
 * Disparo em massa com escolha de destinatarios, previa e historico.
 *
 * A plataforma tem mais de um disparo desse tipo -- convite de perfil e primeiro
 * acesso -- e os dois pedem exatamente as mesmas garantias: o admin ve quem vai
 * receber, ve o texto antes, confirma, e encontra depois o resultado de cada
 * destinatario. So' mudam o texto, o destino e quem esta' na fila, entao isso
 * sao propriedades, nao um segundo componente que divergiria na primeira
 * correcao feita em um so' dos dois.
 */
export function DispatchPanel({
  titulo,
  icone,
  endpoint,
  destinatarios,
  historico,
  vazio,
  acao,
  substantivo,
  previa,
  confirmacao,
}: {
  titulo: string;
  /**
   * O icone chega renderizado, nao como componente.
   *
   * A pagina que usa este painel roda no servidor, e funcao nao atravessa a
   * fronteira para um Client Component -- o Next recusa em tempo de execucao,
   * depois de o build ter passado. Elemento pronto e' serializavel.
   */
  icone: React.ReactNode;
  endpoint: string;
  destinatarios: Destinatario[];
  historico: LoteEnviado[];
  vazio: string;
  acao: string;
  substantivo: { singular: string; plural: string };
  previa: { assunto: string; corpo: string; cta: string };
  confirmacao: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [selecionados, setSelecionados] = React.useState<Set<string>>(new Set());
  const [confirmando, setConfirmando] = React.useState(false);
  const [pendente, setPendente] = React.useState(false);

  function alternar(id: string) {
    setSelecionados((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  const todosSelecionados =
    destinatarios.length > 0 && selecionados.size === destinatarios.length;

  async function enviar() {
    setPendente(true);
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds: [...selecionados] }),
    });
    const payload = await res.json().catch(() => ({}));
    setPendente(false);
    setConfirmando(false);

    if (!res.ok) {
      toast(payload.error ?? `Falha ao disparar ${substantivo.plural}`, 'error');
      return;
    }

    toast(
      payload.failed > 0
        ? `${payload.sent} enviados, ${payload.failed} falharam`
        : `${payload.sent} ${substantivo.plural} enviados`,
      payload.failed > 0 ? 'info' : 'success',
    );
    setSelecionados(new Set());
    router.refresh();
  }

  const n = selecionados.size;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text-1">
            {icone}
            {titulo}
          </h2>
          <Badge tone={destinatarios.length > 0 ? 'warning' : 'positive'}>
            {destinatarios.length} pendente{destinatarios.length === 1 ? '' : 's'}
          </Badge>
        </div>

        {destinatarios.length === 0 ? (
          <p className="text-sm text-text-2">{vazio}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-text-2">
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={(e) =>
                    setSelecionados(
                      e.target.checked ? new Set(destinatarios.map((d) => d.id)) : new Set(),
                    )
                  }
                  className="size-4 rounded border-line-strong accent-[var(--color-brand-strong)]"
                />
                Selecionar todos
              </label>
              <span className="text-xs tabular-nums text-text-3">
                {n} selecionado{n === 1 ? '' : 's'}
              </span>
            </div>

            <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border border-line p-1.5">
              {destinatarios.map((destinatario) => (
                <li key={destinatario.id}>
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-sm p-2 transition-colors hover:bg-surface-sunken">
                    <input
                      type="checkbox"
                      checked={selecionados.has(destinatario.id)}
                      onChange={() => alternar(destinatario.id)}
                      className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-[var(--color-brand-strong)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-text-1">
                        {destinatario.name}
                      </span>
                      <span className="block truncate text-xs text-text-3">
                        {destinatario.email}
                      </span>
                      {destinatario.nota ? (
                        <span className="block text-[11px] text-text-3">{destinatario.nota}</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <Button onClick={() => setConfirmando(true)} disabled={n === 0} className="w-full">
              <Send className="size-4" aria-hidden="true" />
              {acao} ({n})
            </Button>
          </>
        )}

        {historico.length > 0 ? (
          <div className="border-t border-line pt-4">
            <h3 className="text-sm font-semibold text-text-1">Histórico de disparos</h3>
            <ul className="mt-2 space-y-2">
              {historico.map((lote) => (
                <li key={lote.batchId}>
                  <details className="rounded-md border border-line px-3 py-2">
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-text-1">{formatDate(lote.sentAt, true)}</span>
                      <span className="flex items-center gap-1.5">
                        <Badge tone="positive">{lote.ok} enviados</Badge>
                        {lote.failed > 0 ? <Badge tone="danger">{lote.failed} falhas</Badge> : null}
                      </span>
                    </summary>
                    <ul className="mt-2 space-y-1 border-t border-line pt-2">
                      {lote.recipients.map((destinatario) => (
                        <li
                          key={`${lote.batchId}-${destinatario.to}`}
                          className="flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="truncate text-text-2">{destinatario.to}</span>
                          <span
                            className={
                              destinatario.status === 'ENVIADO'
                                ? 'shrink-0 text-positive'
                                : 'shrink-0 text-danger'
                            }
                          >
                            {destinatario.status === 'ENVIADO'
                              ? 'Enviado'
                              : (destinatario.error ?? 'Falhou')}
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
          open={confirmando}
          onOpenChange={setConfirmando}
          title={`Enviar ${n} ${n === 1 ? substantivo.singular : substantivo.plural}?`}
          description={confirmacao}
          confirmLabel="Confirmar disparo"
          tone="primary"
          loading={pendente}
          onConfirm={enviar}
        >
          <div className="rounded-md border border-line bg-surface p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-text-3">
              Prévia do e-mail
            </p>
            <p className="mt-2 text-sm font-medium text-text-1">Assunto: {previa.assunto}</p>
            <p className="mt-2 text-sm leading-relaxed text-text-2">{previa.corpo}</p>
            <p className="mt-3 inline-block rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-contrast)]">
              {previa.cta}
            </p>
          </div>
        </ConfirmDialog>
      </CardContent>
    </Card>
  );
}
