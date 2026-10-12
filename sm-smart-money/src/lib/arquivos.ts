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

/**
 * Traduz a falha de envio para algo que o administrador consiga agir.
 *
 * O SDK do armazenamento fala ingles e em jargao proprio ("Access denied,
 * please provide a valid token for this resource") -- texto que nao diz a quem
 * usa o painel o que fazer, num sistema que e' todo em portugues. As compara-
 * coes sao por trecho da mensagem porque as classes de erro do pacote nao
 * expoem `name` nem sao exportadas pelo modulo do cliente.
 */
export function mensagemDoEnvio(erro: unknown, tipo: TipoDeArquivo): string {
  const texto = erro instanceof Error ? erro.message : String(erro);

  // O pacote descarta a resposta da nossa rota e so' diz que nao conseguiu o
  // token, entao "Acesso restrito" nunca chega aqui. Na pratica isso acontece
  // quando a sessao vence com o formulario aberto.
  if (texto.includes('retrieve the client token')) {
    return 'O sistema não autorizou o envio. Entre na conta outra vez e repita.';
  }
  if (texto.includes('Access denied')) {
    return 'O armazenamento recusou o envio. Confira o BLOB_READ_WRITE_TOKEN nas variáveis do projeto.';
  }
  if (texto.includes('Client token has expired')) {
    return 'A autorização de envio expirou. Tente enviar outra vez.';
  }
  if (texto.includes('This store does not exist')) {
    return 'O armazenamento não foi encontrado. Reconecte o Blob ao projeto na Vercel.';
  }
  if (texto.includes('This store has been suspended')) {
    return 'O armazenamento está suspenso. Verifique a conta na Vercel.';
  }
  if (texto.includes('not available')) {
    return 'O armazenamento está fora do ar. Tente de novo em alguns minutos.';
  }
  if (texto.includes('Too many requests')) {
    return 'Muitos envios ao mesmo tempo. Espere um instante e tente de novo.';
  }
  if (texto.includes('File is too large')) {
    return `O arquivo passa de ${limiteEmMb(tipo)} MB.`;
  }
  if (texto.includes('Content type mismatch')) {
    return `Esse arquivo não é um ${REGRAS[tipo].rotulo} aceito aqui.`;
  }
  if (ehFalhaDeRede(erro)) {
    return 'Não foi possível falar com o armazenamento. Verifique a conexão e tente de novo.';
  }
  return 'Falha ao enviar o arquivo. Tente de novo.';
}

/**
 * A conexao nao chegou ao armazenamento -- diferente de o armazenamento ter
 * recusado. O navegador lanca TypeError nesse caso, nao um erro do pacote.
 */
export function ehFalhaDeRede(erro: unknown): boolean {
  const texto = erro instanceof Error ? erro.message : String(erro);
  return (
    texto.includes('Failed to fetch') ||
    texto.includes('NetworkError') ||
    texto.includes('network error') ||
    texto.includes('Load failed')
  );
}
