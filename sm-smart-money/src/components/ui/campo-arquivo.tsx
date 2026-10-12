'use client';

import * as React from 'react';
import { upload } from '@vercel/blob/client';
import { Loader2, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { REGRAS, limiteEmMb, type TipoDeArquivo } from '@/lib/arquivos';

/**
 * Um campo de endereco de arquivo, com um botao para enviar o arquivo em vez de
 * procurar um endereco para ele.
 *
 * Continua sendo um `<input name=...>` de verdade: o formulario le' por
 * FormData e nao precisa saber que existe envio. E o campo segue editavel, de
 * proposito -- quem ja' hospeda o arquivo em outro lugar cola o endereco e
 * ignora o botao.
 *
 * O arquivo vai do navegador direto para o armazenamento. A Vercel corta
 * requisicao em 4,5 MB em qualquer plano, e um PDF de analise passa disso: se
 * ele subisse por uma rota nossa, falharia justamente nos arquivos que mais
 * importam.
 */
export function CampoArquivo({
  id,
  name,
  tipo,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  podeEnviar,
}: {
  id: string;
  /** Ausente quando o formulario le' o valor do estado, e nao por FormData. */
  name?: string;
  tipo: TipoDeArquivo;
  defaultValue?: string | null;
  /** Com `value` e `onValueChange`, quem guarda o endereco e' o formulario. */
  value?: string;
  onValueChange?: (valor: string) => void;
  placeholder?: string;
  /** Falso quando o armazenamento nao esta' configurado: so' o campo aparece. */
  podeEnviar: boolean;
}) {
  const { toast } = useToast();
  const entrada = React.useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = React.useState(false);

  // Dois modos. Alguns formularios leem por FormData e nao guardam estado --
  // esses deixam o campo se virar. Outros ja' guardam o endereco para mostrar
  // uma previa enquanto se digita, e ai' quem manda e' o formulario: dois donos
  // do mesmo valor sempre acabam divergindo.
  const [interno, setInterno] = React.useState(defaultValue ?? '');
  const controlado = value !== undefined;
  const valor = controlado ? value : interno;
  const definir = React.useCallback(
    (novo: string) => (controlado ? onValueChange?.(novo) : setInterno(novo)),
    [controlado, onValueChange],
  );

  const regra = REGRAS[tipo];

  async function escolheu(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    // Deixa o seletor pronto para a proxima escolha, inclusive do mesmo arquivo.
    evento.target.value = '';
    if (!arquivo) return;

    // Confere antes de subir: o servidor recusaria igual, mas so' depois de a
    // pessoa esperar o envio inteiro de um arquivo grande demais.
    if (arquivo.size > regra.limiteBytes) {
      toast(`O arquivo passa de ${limiteEmMb(tipo)} MB`, 'error');
      return;
    }

    setEnviando(true);
    try {
      const enviado = await upload(`${regra.pasta}/${arquivo.name}`, arquivo, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        // Diz ao servidor que regra aplicar; ele nao confia no nome do arquivo.
        clientPayload: tipo,
      });
      definir(enviado.url);
      toast('Arquivo enviado', 'success');
    } catch (erro) {
      toast(erro instanceof Error ? erro.message : 'Falha ao enviar o arquivo', 'error');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-2">
      <Input
        id={id}
        name={name}
        type="url"
        value={valor}
        onChange={(e) => definir(e.target.value)}
        placeholder={
          placeholder ??
          (podeEnviar ? 'Envie o arquivo ou cole um endereço' : 'Cole o endereço do arquivo')
        }
      />

      {podeEnviar ? (
        <>
          <input
            ref={entrada}
            type="file"
            accept={regra.tipos.join(',')}
            onChange={(e) => void escolheu(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-md border border-line-strong px-3 py-1.5 text-xs text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1 disabled:cursor-progress disabled:opacity-60"
          >
            {enviando ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="size-3.5" aria-hidden="true" />
            )}
            {enviando ? 'Enviando...' : `Enviar ${regra.rotulo}`}
            <span className="text-text-3">até {limiteEmMb(tipo)} MB</span>
          </button>
        </>
      ) : null}
    </div>
  );
}
