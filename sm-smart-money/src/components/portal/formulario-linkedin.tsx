'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';

/** O campo unico da tela de pendencia do LinkedIn. */
export function FormularioLinkedin() {
  const router = useRouter();
  const [valor, setValor] = React.useState('');
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);

    const res = await fetch('/api/perfil/linkedin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ linkedinUrl: valor }),
    }).catch(() => null);

    if (!res) {
      setEnviando(false);
      setErro('Não foi possível salvar. Verifique a conexão e tente de novo.');
      return;
    }

    const resposta = await res.json().catch(() => ({}));
    if (!res.ok) {
      setEnviando(false);
      setErro(resposta.error ?? 'Não foi possível salvar o LinkedIn');
      return;
    }

    // Nao desliga o "enviando": a navegacao ja' esta' a caminho, e devolver o
    // botao ao normal antes de a tela trocar convida a um segundo clique.
    router.replace('/dashboard');
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="w-full space-y-4">
      <Field
        label="Seu LinkedIn"
        htmlFor="linkedinUrl"
        required
        hint="Cole o endereço do seu perfil. Serve com ou sem https:// na frente."
      >
        <Input
          id="linkedinUrl"
          name="linkedinUrl"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="linkedin.com/in/seu-perfil"
          autoFocus
          autoComplete="url"
          required
        />
      </Field>

      {erro ? (
        <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {erro}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={enviando || !valor.trim()}>
        {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        Salvar e continuar
      </Button>
    </form>
  );
}
