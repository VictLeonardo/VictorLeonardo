import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { stripeConfigured } from '@/lib/env';
import { VipPitch } from './vip-pitch';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,42%)]">
      {/* Painel de marca: some no mobile para o formulario ocupar a tela toda.
          O convite para assinar reaparece embaixo do formulario, entao quem
          chega pelo celular nao fica sem caminho de entrada. */}
      <aside className="relative hidden flex-col bg-[var(--color-brand-contrast)] lg:flex">
        <div className="flex max-h-dvh flex-col gap-9 overflow-y-auto p-10 xl:p-12">
          <Logo className="[&_span]:text-white" />
          <VipPitch mostrarCta={stripeConfigured} />
          <p className="mt-auto pt-2 text-xs text-white/35">
            © {new Date().getFullYear()} SM Smart Money. Todos os direitos reservados.
          </p>
        </div>
      </aside>

      <main
        id="conteudo-principal"
        className="flex flex-col justify-center bg-canvas px-6 py-10 sm:px-12"
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
      </main>
    </div>
  );
}
