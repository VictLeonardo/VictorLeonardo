/**
 * O que a plataforma aceita receber, de quem, e ate' que tamanho.
 *
 * As regras vivem aqui, e nao na rota, porque quem precisa delas e' tambem a
 * tela: o seletor de arquivo filtra pelos mesmos tipos que o servidor autoriza,
 * entao a pessoa nao escolhe um arquivo so' para ser recusada depois de esperar
 * o envio.
 */

export type TipoDeArquivo = 'pdf' | 'imagem' | 'audio' | 'avatar';

export const REGRAS: Record<
  TipoDeArquivo,
  {
    tipos: string[];
    limiteBytes: number;
    rotulo: string;
    pasta: string;
    /** Quem pode enviar este tipo. */
    quem: 'admin' | 'membro';
  }
> = {
  // Analise de mercado com graficos passa facil de dez megabytes; o teto existe
  // para barrar engano, nao para apertar quem publica.
  pdf: {
    tipos: ['application/pdf'],
    limiteBytes: 50 * 1024 * 1024,
    rotulo: 'PDF',
    pasta: 'documentos',
    quem: 'admin',
  },
  // Capas de conteudo e de palestra, e foto de palestrante.
  imagem: {
    tipos: ['image/jpeg', 'image/png', 'image/webp'],
    limiteBytes: 8 * 1024 * 1024,
    rotulo: 'imagem',
    pasta: 'imagens',
    quem: 'admin',
  },
  // Episodio de podcast. Uma hora a 128 kbps passa de cinquenta megabytes, e
  // ninguem corta o episodio para caber num limite nosso.
  audio: {
    tipos: ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg'],
    limiteBytes: 200 * 1024 * 1024,
    rotulo: 'áudio',
    pasta: 'audio',
    quem: 'admin',
  },
  /**
   * Foto de perfil, enviada pelo proprio membro.
   *
   * E' o unico tipo que nao exige administrador, e por isso tem o teto mais
   * apertado e a lista mais curta: sao quarenta e cinco pessoas conhecidas e
   * pagantes, nao a internet aberta, mas a porta ainda assim e' mais estreita
   * do que a do admin.
   */
  avatar: {
    tipos: ['image/jpeg', 'image/png', 'image/webp'],
    limiteBytes: 4 * 1024 * 1024,
    rotulo: 'foto',
    pasta: 'avatares',
    quem: 'membro',
  },
};

export function ehTipoDeArquivo(valor: unknown): valor is TipoDeArquivo {
  return typeof valor === 'string' && valor in REGRAS;
}

/** Em MB, para dizer o limite a quem esta' olhando a tela. */
export function limiteEmMb(tipo: TipoDeArquivo): number {
  return Math.round(REGRAS[tipo].limiteBytes / (1024 * 1024));
}
