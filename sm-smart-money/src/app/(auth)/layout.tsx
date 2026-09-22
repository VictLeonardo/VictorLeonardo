import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { stripeConfigured } from '@/lib/env';
import { precoDaAssinatura } from '@/server/preco';
import { VipAbertura, VipBeneficios, VipPitch } from './vip-pitch';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Lido do Stripe uma vez por hora, nao a cada visita, e nulo se a cobranca
  // estiver fora do ar -- o botao continua convidando, so' sem o valor.
  const preco = await precoDaAssinatura();

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,42%)]">
      {/* Painel de marca, ao lado do formulario a partir do desktop. No celular
          ele nao cabe lado a lado: parte em duas e o formulario entra no meio
          -- abertura acima, beneficios abaixo, nas duas secoes deste arquivo.
          Mesmo conteudo e mesmo fundo, so' desdobrado. */}
      <aside className="relative hidden flex-col bg-brand-panel lg:flex">
        <div className="flex max-h-dvh flex-col gap-9 overflow-y-auto p-10 xl:p-12">
          <Logo size="lg" priority className="[&_span]:text-brand-ink" />
          <VipPitch mostrarCta={stripeConfigured} preco={preco} />
          <p className="mt-auto pt-2 text-xs text-brand-ink-muted">
            © {new Date().getFullYear()} SM Smart Money. Todos os direitos reservados.
          </p>
        </div>
      </aside>

      <main className="flex flex-col bg-canvas">
        {/* 1 — No celular a abertura abre a pagina. Quem chega pelo link
            compartilhado ve' primeiro o que e' o VIP Lounge e quanto custa; o
            painel lateral do desktop diz a mesma coisa no mesmo lugar de
            leitura, so' que ao lado em vez de acima. */}
        <section className="bg-brand-panel px-6 py-12 sm:px-12 lg:hidden">
          <VipAbertura mostrarCta={stripeConfigured} preco={preco} />
        </section>

        {/* 2 — O formulario. Leva o `id` do link de pular conteudo: com a
            abertura acima, o alvo do salto cairia no texto de venda, e quem
            usa teclado ou leitor de tela quer chegar ao campo de e-mail. */}
        <div
          id="conteudo-principal"
          className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-12 sm:py-10"
        >
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

        {/* 3 — O que se leva ao entrar, fechando a pagina. Fica depois do
            formulario porque reforca a decisao de quem ainda esta' pensando,
            sem atrasar quem veio so' para entrar. */}
        <section className="flex flex-col gap-8 bg-brand-panel px-6 py-12 sm:px-12 lg:hidden">
          <VipBeneficios />
          <p className="text-xs text-brand-ink-muted">
            © {new Date().getFullYear()} SM Smart Money. Todos os direitos reservados.
          </p>
        </section>
      </main>
    </div>
  );
}
