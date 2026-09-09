import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * Layout das telas de conta bloqueada (cancelada / pendente). Fica fora do grupo
 * (portal) de proposito: o layout do portal redireciona quem nao tem assinatura
 * ativa para ca, e as duas coisas juntas dariam um loop de redirect.
 */
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-5 py-8">
      <div className="mx-auto flex w-full max-w-4xl justify-end">
        <ThemeToggle />
      </div>
      <main id="conteudo-principal">{children}</main>
    </div>
  );
}
