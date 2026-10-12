'use client';

import * as React from 'react';
import { upload } from '@vercel/blob/client';
import { Loader2, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import {
  REGRAS,
  ehFalhaDeRede,
  limiteEmMb,
  mensagemDoEnvio,
  type TipoDeArquivo,
} from '@/lib/arquivos';

/** Quanto tempo sem um unico byte novo antes de desistir da passada. */
const PARADO_POR_MS = 30_000;
/** Teto da passada sem acompanhamento, que nao tem como detectar parada. */
const TETO_SEM_PROGRESSO_MS = 45_000;

/** Marca a desistencia por parada, para distingui-la de uma recusa do servidor. */
const PAROU = Symbol('envio parado');

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
  /** `null` enquanto nao se sabe o quanto subiu. */
  const [progresso, setProgresso] = React.useState<number | null>(null);
  const abortador = React.useRef<AbortController | null>(null);
  const cancelouAmao = React.useRef(false);

  // Sair da pagina no meio do envio nao deve deixar a repeticao do pacote e o
  // vigia rodando atras de um campo que nao existe mais.
  React.useEffect(() => () => abortador.current?.abort(), []);

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

  /**
   * Uma tentativa de envio.
   *
   * Com `acompanhar`, o pacote manda o arquivo como fluxo para poder avisar o
   * quanto ja' subiu -- e o Chromium so' aceita corpo em fluxo sobre HTTP/2.
   * O endereco de verdade do armazenamento atende em HTTP/2, mas rede que
   * rebaixa para HTTP/1.1 recusaria o envio inteiro. Por isso a chamada sem
   * acompanhamento existe: e' o caminho antigo, guardado como rede de seguranca.
   */
  function subir(
    arquivo: File,
    controle: AbortController,
    acompanhar: ((enviados: number, porcento: number) => void) | null,
  ) {
    return upload(`${regra.pasta}/${arquivo.name}`, arquivo, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      // Diz ao servidor que regra aplicar; ele nao confia no nome do arquivo.
      clientPayload: tipo,
      abortSignal: controle.signal,
      ...(acompanhar
        ? {
            onUploadProgress: ({ loaded, percentage }) => acompanhar(loaded, percentage),
          }
        : {}),
    });
  }

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

    cancelouAmao.current = false;
    setEnviando(true);

    // Duas passadas. A primeira acompanha o quanto subiu. Se ela nem conseguir
    // falar com o armazenamento, a segunda repete sem acompanhar -- porque e'
    // justamente o acompanhamento que exige HTTP/2, e assim uma rede que
    // rebaixa a conexao nao deixa o envio impossivel.
    const passadas = [
      { acompanhar: true, paradaMs: PARADO_POR_MS },
      { acompanhar: false, paradaMs: TETO_SEM_PROGRESSO_MS },
    ];

    let ultimoErro: unknown = null;
    for (const [indice, passada] of passadas.entries()) {
      // O clique em Cancelar pode cair no intervalo entre as passadas, quando
      // o abortador da passada anterior ja' se esgotou: sem isto, a segunda
      // passada comecaria apesar do pedido.
      if (cancelouAmao.current) break;
      setProgresso(passada.acompanhar ? 0 : null);
      try {
        const enviado = await tentativa(arquivo, passada);
        definir(enviado.url);
        toast('Arquivo enviado', 'success');
        ultimoErro = null;
        break;
      } catch (erro) {
        ultimoErro = erro;
        // Recuar so' faz sentido quando nao se chegou a falar com o
        // armazenamento. Numa recusa dele -- token errado, arquivo grande --
        // a segunda passada falharia igual e a espera dobraria por nada.
        const vaiRecuar =
          indice === 0 && !cancelouAmao.current && (erro === PAROU || ehFalhaDeRede(erro));
        if (!vaiRecuar) break;
      }
    }

    if (ultimoErro !== null) {
      if (cancelouAmao.current) {
        toast('Envio cancelado', 'info');
      } else if (ultimoErro === PAROU) {
        // Nao diz "verifique a conexao": a parada tambem acontece com o
        // armazenamento fora do ar, e ai' mandar a pessoa olhar a propria
        // internet a faz procurar defeito onde nao tem.
        toast(
          'O envio não foi concluído: o armazenamento parou de responder. Tente de novo em alguns minutos.',
          'error',
        );
      } else {
        toast(mensagemDoEnvio(ultimoErro, tipo), 'error');
      }
    }

    abortador.current = null;
    setProgresso(null);
    setEnviando(false);
  }

  /** Uma passada, que desiste quando o envio para de avancar. */
  async function tentativa(
    arquivo: File,
    { acompanhar, paradaMs }: { acompanhar: boolean; paradaMs: number },
  ) {
    const controle = new AbortController();
    abortador.current = controle;

    // O pacote repete com espera crescente quando a conexao falha -- dez vezes,
    // e nao da' para mudar isso do navegador. Isso ajuda em rede instavel, mas
    // sem desistir a tela fica parada em "Enviando..." por minutos e sem aviso
    // nenhum: medido, 183 s e 8 repeticoes. A conta e' por parada, nao por
    // tempo total, porque um audio de 200 MB em linha lenta demora e mesmo
    // assim avanca.
    let ultimoAvanco = Date.now();
    // So' conta byte que ainda nao tinha subido: o pacote avisa 0% no inicio de
    // cada repeticao, e aceitar isso como avanco rearmaria o relogio.
    let maiorEnviado = 0;
    let parou = false;
    const vigia = setInterval(() => {
      if (Date.now() - ultimoAvanco > paradaMs) {
        parou = true;
        controle.abort();
      }
    }, 2_000);

    try {
      return await subir(
        arquivo,
        controle,
        acompanhar
          ? (enviados, porcento) => {
              if (enviados > maiorEnviado) {
                maiorEnviado = enviados;
                ultimoAvanco = Date.now();
              }
              setProgresso(porcento);
            }
          : null,
      );
    } catch (erro) {
      throw parou && !cancelouAmao.current ? PAROU : erro;
    } finally {
      clearInterval(vigia);
    }
  }

  function cancelar() {
    cancelouAmao.current = true;
    abortador.current?.abort();
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
          <div className="flex items-center gap-2">
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
              {enviando
                ? `Enviando...${progresso === null ? '' : ` ${Math.round(progresso)}%`}`
                : `Enviar ${regra.rotulo}`}
              {enviando ? null : (
                <span className="text-text-3">até {limiteEmMb(tipo)} MB</span>
              )}
            </button>

            {enviando ? (
              <button
                type="button"
                onClick={cancelar}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-text-3 transition-colors hover:text-text-1"
              >
                <X className="size-3.5" aria-hidden="true" />
                Cancelar
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
