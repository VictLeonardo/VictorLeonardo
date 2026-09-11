import type { Metadata } from 'next';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Pagamento confirmado' };

/**
 * Retorno do checkout.
 *
 * A pagina nao grava nada e nao afirma que a assinatura esta ativa: ela e'
 * carregada pelo navegador do visitante, e isso nao e' prova de pagamento. Quem
 * confirma e' o webhook, e o sinal de que deu certo, para quem esta lendo, e' o
 * e-mail chegar.
 */
export default function SucessoPage() {
  return (
    <div className="space-y-7 text-center">
      <MailCheck className="mx-auto size-9 text-brand-strong" aria-hidden="true" />

      <div className="space-y-2">
        <h1 className="font-display text-3xl text-text-1">Pagamento recebido</h1>
        <p className="text-sm leading-relaxed text-text-2">
          Enviamos para o seu e-mail um link para definir a senha de acesso. Ele vale por 7 dias e
          leva direto para a comunidade.
        </p>
      </div>

      <div className="rounded-md border border-line bg-surface-sunken px-4 py-3 text-left">
        <p className="text-xs leading-relaxed text-text-2">
          Se o e-mail não chegar em alguns minutos, confira a caixa de spam. Continuando sem
          aparecer, fale com a equipe SM que resolvemos.
        </p>
      </div>

      <Button asChild variant="secondary" className="w-full">
        <Link href="/login">Ir para o login</Link>
      </Button>
    </div>
  );
}
