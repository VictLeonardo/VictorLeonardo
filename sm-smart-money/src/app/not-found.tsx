import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-text-1">Página não encontrada</h1>
        <p className="max-w-md text-sm text-text-2">
          O endereço que você acessou não existe ou foi movido.
        </p>
      </div>
      <Button asChild variant="secondary">
        <Link href="/">Voltar para a comunidade</Link>
      </Button>
    </main>
  );
}
