/**
 * O que a plataforma aceita receber, e ate' que tamanho.
 *
 * As regras vivem aqui, e nao na rota, porque quem precisa delas e' tambem a
 * tela: o seletor de arquivo filtra pelos mesmos tipos que o servidor autoriza,
 * entao a pessoa nao escolhe um arquivo so' para ser recusada depois de esperar
 * o envio.
 */

export type TipoDeArquivo = 'pdf' | 'imagem';

export const REGRAS: Record<
  TipoDeArquivo,
  { tipos: string[]; limiteBytes: number; rotulo: string; pasta: string }
> = {
  // Analise de mercado com graficos passa facil de dez megabytes; o teto existe
  // para barrar engano, nao para apertar quem publica.
  pdf: {
    tipos: ['application/pdf'],
    limiteBytes: 50 * 1024 * 1024,
    rotulo: 'PDF',
    pasta: 'documentos',
  },
  imagem: {
    tipos: ['image/jpeg', 'image/png', 'image/webp'],
    limiteBytes: 8 * 1024 * 1024,
    rotulo: 'imagem',
    pasta: 'imagens',
  },
};

export function ehTipoDeArquivo(valor: unknown): valor is TipoDeArquivo {
  return typeof valor === 'string' && valor in REGRAS;
}

/** Em MB, para dizer o limite a quem esta' olhando a tela. */
export function limiteEmMb(tipo: TipoDeArquivo): number {
  return Math.round(REGRAS[tipo].limiteBytes / (1024 * 1024));
}
