import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { stripeConfigured } from '@/lib/env';
import { precoDaAssinatura } from '@/server/preco';
import { VipPitch } from './vip-pitch';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Lido do Stripe uma vez por hora, nao a cada visita, e nulo se a cobranca
  // estiver fora do ar -- o botao continua convidando, so' sem o valor.
  const preco = await precoDaAssinatura();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,42%)]">
      {/* Painel de marca, ao lado do formulario a partir do desktop. No celular
          ele nao cabe lado a lado e reaparece abaixo, na secao do fim deste
          arquivo -- mesmo conteudo, mesmo fundo, so' empilhado. */}
      <aside className="relative hidden flex-col bg-brand-panel lg:flex">
        <div className="flex max-h-dvh flex-col gap-9 overflow-y-auto p-10 xl:p-12">
          <Logo size="lg" priority className="[&_span]:text-brand-ink" />
          <VipPitch mostrarCta={stripeConfigured} preco={preco} />
          <p className="mt-auto pt-2 text-xs text-brand-ink-muted">
            © {new Date().getFullYear()} SM Smart Money. Todos os direitos reservados.
          </p>
        </div>
      </aside>

      <main id="conteudo-principal" className="flex flex-col bg-canvas">
        <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-12 sm:py-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Logo />
              <ThemeToggle />
            </div>
            {children}
          </div>
          <div className="mx-auto mt-10 hidden w-full max-w-sm justify-end lg:flex">
            <ThemeToggle />
          </div>
        </div>

        {/* A mesma proposta do painel lateral, para quem chega pelo celular.
            Fica abaixo do formulario, e nao acima, porque a maioria de quem abre
            esta tela ja' e' membro e veio para entrar -- e porque o convite para
            assinar so' faz sentido depois de dizer o que se esta' assinando.

            O formulario nao ocupa a tela inteira de proposito: o verde do painel
            aparece na dobra e convida a rolar. */}
        <section className="flex flex-col gap-8 bg-brand-panel px-6 py-12 sm:px-12 lg:hidden">
          <VipPitch mostrarCta={stripeConfigured} preco={preco} />
          <p className="text-xs text-brand-ink-muted">
            © {new Date().getFullYear()} SM Smart Money. Todos os direitos reservados.
          </p>
        </section>
      </main>
    </div>
  );
}
