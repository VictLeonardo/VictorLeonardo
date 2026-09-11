'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';
import type { ResumoAssinatura } from '@/server/subscriptions';

/**
 * Controles da assinatura do proprio membro.
 *
 * Cancelar tem tela aqui, com confirmacao explicita, como toda acao destrutiva
 * da plataforma. Trocar cartao e baixar fatura ficam no portal do Stripe:
 * reconstruir isso significaria receber numero de cartao aqui dentro, o que muda
 * a exigencia de conformidade sem ganho nenhum para quem usa.
 */
export function SubscriptionPanel({ resumo }: { resumo: ResumoAssinatura }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmando, setConfirmando] = React.useState(false);
  const [pendente, setPendente] = React.useState<'cancelar' | 'retomar' | 'portal' | null>(null);

  async function chamar(acao: 'cancelar' | 'retomar' | 'portal') {
    setPendente(acao);
    try {
      const res = await fetch(`/api/assinatura/${acao}`, { method: 'POST' });
      const payload = await res.json();

      if (!res.ok) {
        toast(payload.error ?? 'Não foi possível concluir', 'error');
        setPendente(null);
        return;
      }

      if (acao === 'portal') {
        window.location.href = payload.url;
        return;
      }

      toast(
        acao === 'cancelar'
          ? 'Assinatura cancelada. Seu acesso continua até o fim do período pago.'
          : 'Assinatura retomada.',
        'success',
      );
      setConfirmando(false);
      setPendente(null);
      router.refresh();
    } catch {
      toast('Falha de conexão. Tente novamente.', 'error');
      setPendente(null);
    }
  }

  const fim = resumo.fimDoPeriodo ? formatDate(resumo.fimDoPeriodo) : null;

  return (
    <div className="flex flex-col gap-5">
      {resumo.cancelamentoAgendado ? (
        <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3.5">
          <p className="text-sm font-medium text-text-1">Cancelamento agendado</p>
          <p className="mt-1 text-sm leading-relaxed text-text-2">
            {fim
              ? `Seu acesso continua liberado até ${fim}. Depois dessa data a conta passa para cancelada e o conteúdo da comunidade fica suspenso.`
              : 'Seu acesso continua liberado até o fim do período já pago.'}
          </p>
        </div>
      ) : null}

      {resumo.status === 'INADIMPLENTE' ? (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3.5">
          <p className="text-sm font-medium text-text-1">Pagamento não confirmado</p>
          <p className="mt-1 text-sm leading-relaxed text-text-2">
            A última cobrança não passou. Atualize o cartão para não perder o acesso, que segue
            liberado enquanto as novas tentativas acontecem.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2.5">
        {resumo.temCartao ? (
          <Button
            variant="secondary"
            onClick={() => void chamar('portal')}
            disabled={pendente !== null}
          >
            {pendente === 'portal' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard className="size-4" aria-hidden="true" />
            )}
            Cartão e faturas
          </Button>
        ) : null}

        {resumo.configurada && resumo.cancelamentoAgendado ? (
          <Button onClick={() => void chamar('retomar')} disabled={pendente !== null}>
            {pendente === 'retomar' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="size-4" aria-hidden="true" />
            )}
            Retomar assinatura
          </Button>
        ) : null}

        {resumo.configurada && !resumo.cancelamentoAgendado ? (
          <Button
            variant="ghost"
            onClick={() => setConfirmando(true)}
            disabled={pendente !== null}
            className="text-danger hover:bg-danger/10"
          >
            Cancelar assinatura
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={confirmando}
        onOpenChange={setConfirmando}
        title="Cancelar sua assinatura?"
        description={
          fim
            ? `Você continua com acesso completo até ${fim}, que é o fim do período já pago. Depois disso o conteúdo da comunidade fica suspenso e seu perfil público permanece no ar. Dá para retomar a qualquer momento antes dessa data.`
            : 'Você continua com acesso até o fim do período já pago. Depois disso o conteúdo da comunidade fica suspenso e seu perfil público permanece no ar.'
        }
        confirmLabel="Cancelar assinatura"
        cancelLabel="Manter assinatura"
        loading={pendente === 'cancelar'}
        onConfirm={() => chamar('cancelar')}
      />
    </div>
  );
}
