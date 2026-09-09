import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,42%)]">
      {/* Painel de marca: some no mobile para o formulario ocupar a tela toda. */}
      <aside className="relative hidden flex-col justify-between bg-[var(--color-brand-contrast)] p-10 lg:flex">
        <Logo className="[&_span]:text-white" />
        <div className="max-w-md space-y-4">
          <p className="font-display text-4xl leading-tight text-white">
            Inteligência financeira para quem decide.
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            Análises de mercado, palestras com especialistas, diagnóstico patrimonial e uma rede de
            empresários e investidores que compartilham o mesmo nível de exigência.
          </p>
        </div>
        <p className="text-xs text-white/40">
          © {new Date().getFullYear()} SM Smart Money. Todos os direitos reservados.
        </p>
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
