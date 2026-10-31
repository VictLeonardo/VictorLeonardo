import { z, type ZodError, type ZodTypeAny } from 'zod';

/**
 * O nome que cada campo tem na tela.
 *
 * O prefixo do erro existe para dizer qual campo recusou -- sem ele, "Informe
 * uma URL valida" manda a pessoa adivinhar entre vinte campos. Mas o nome que
 * o Zod conhece e' o do codigo: "linkedinUrl", "jobTitle", "speakerAvatarUrl".
 * Mostrar isso a quem preenche e' vazar nome interno, e nao ajuda nem um pouco
 * quem nunca viu o schema.
 *
 * Entao o prefixo continua, com o rotulo que a pessoa esta' lendo logo acima do
 * campo. Onde um campo aparece em mais de um formulario com nomes diferentes
 * ("Nome completo" e "Nome"), vale o termo que serve nos dois.
 */
const ROTULOS: Record<string, string> = {
  audience: 'Público',
  authorName: 'Autor',
  avatarUrl: 'Foto de perfil',
  bio: 'Bio',
  body: 'Mensagem',
  category: 'Categoria',
  channel: 'Canal',
  city: 'Cidade',
  company: 'Empresa',
  confirm: 'Confirme a nova senha',
  country: 'País',
  coverUrl: 'Capa',
  description: 'Descrição',
  durationMin: 'Duração (minutos)',
  durationSecs: 'Duração (segundos)',
  email: 'E-mail',
  episodeNumber: 'Episódio',
  excerpt: 'Resumo',
  fileUrl: 'Arquivo PDF',
  isPartner: 'Marcar como SM Partner',
  isPublic: 'Perfil público ativo',
  isVip: 'Restringir aos membros VIP',
  jobTitle: 'Cargo',
  joinedAt: 'Data de entrada',
  key: 'Chave do template',
  linkedinUrl: 'LinkedIn',
  liveUrl: 'Link da transmissão',
  mediaUrl: 'Endereço do áudio ou do vídeo',
  message: 'Mensagem',
  name: 'Nome',
  pageCount: 'Número de páginas',
  password: 'Senha',
  phone: 'WhatsApp',
  plan: 'Plano',
  planFilter: 'Plano',
  publishedAt: 'Data de publicação',
  recordingUrl: 'Gravação',
  remember: 'Lembrar de mim',
  scheduledFor: 'Agendamento',
  sendNow: 'Enviar agora',
  sendWelcome: 'Enviar e-mail de boas-vindas',
  seriesName: 'Série',
  showWhatsapp: 'Exibir WhatsApp no perfil',
  slug: 'Slug',
  speakerAvatarUrl: 'Foto do palestrante',
  speakerBio: 'Bio do palestrante',
  speakerJobTitle: 'Cargo do palestrante',
  speakerName: 'Nome do palestrante',
  specialties: 'Áreas de atuação',
  startsAt: 'Data e hora',
  state: 'Estado',
  status: 'Status',
  subject: 'Assunto',
  theme: 'Tema',
  tier: 'Tier de acesso',
  title: 'Título',
  token: 'Link de redefinição',
  transcript: 'Transcrição',
  type: 'Tipo',
  url: 'Link',
  userIds: 'Membros',
  visibility: 'Visibilidade',
  websiteUrl: 'Site pessoal',
};

/**
 * A mensagem de um erro de validacao, dizendo em qual campo.
 *
 * O Zod descreve uma uniao mal preenchida apenas como "Invalid input". Uma tela
 * que devolve so' isso manda a pessoa adivinhar entre vinte campos qual deles
 * recusou -- e quando o campo nem esta' visivel, como acontece num formulario
 * que muda conforme o tipo, nao ha' o que adivinhar.
 *
 * Campo sem rotulo conhecido sai sem prefixo nenhum: e' melhor perder a dica do
 * que trocar o nome da tela pelo nome do codigo.
 */
export function mensagemDeValidacao(erro: ZodError): string {
  const problema = erro.issues[0];
  // Caminho aninhado ("specialties.0") responde pelo campo de cima.
  const campo = problema.path.find((p) => typeof p === 'string');
  const rotulo = typeof campo === 'string' ? ROTULOS[campo] : undefined;
  const motivo = emPortugues(problema.message);
  return rotulo ? `${rotulo}: ${motivo}` : motivo;
}

/**
 * Traduz o que o Zod escreve quando ninguem escreveu nada.
 *
 * O padrao dele e' ingles tecnico -- "String must contain at least 3
 * character(s)", "Invalid url" -- e isso chegava inteiro a quem preenche, num
 * sistema que e' todo em portugues.
 *
 * A troca e' por texto exato do pacote, e nao por codigo do problema, de
 * proposito: assim uma mensagem que nos mesmos escrevemos nunca e' substituida
 * por engano. Sobra em ingles apenas o que o Zod venha a inventar de novo, e
 * nesse caso o texto original passa adiante em vez de virar algo generico.
 */
function emPortugues(mensagem: string): string {
  const exatas: Record<string, string> = {
    Required: 'Campo obrigatório',
    'Invalid input': 'Valor inválido',
    'Invalid url': 'Endereço inválido',
    'Invalid email': 'E-mail inválido',
    'Invalid uuid': 'Identificador inválido',
    'Invalid date': 'Data inválida',
    'Invalid literal value': 'Valor inválido',
    'Expected number, received nan': 'Informe um número',
  };
  if (exatas[mensagem]) return exatas[mensagem];

  const porPadrao: Array<[RegExp, (n: string) => string]> = [
    [/^String must contain at least (\d+) character\(s\)$/, (n) =>
      n === '1' ? 'Campo obrigatório' : `Escreva ao menos ${n} caracteres`],
    [/^String must contain at most (\d+) character\(s\)$/, (n) => `No máximo ${n} caracteres`],
    [/^String must contain exactly (\d+) character\(s\)$/, (n) => `Deve ter ${n} caracteres`],
    [/^Array must contain at least (\d+) element\(s\)$/, (n) =>
      n === '1' ? 'Selecione ao menos um' : `Selecione ao menos ${n}`],
    [/^Array must contain at most (\d+) element\(s\)$/, (n) => `No máximo ${n} itens`],
    [/^Number must be greater than or equal to (-?[\d.]+)$/, (n) => `Use ${n} ou mais`],
    [/^Number must be less than or equal to (-?[\d.]+)$/, (n) => `Use ${n} ou menos`],
    [/^Number must be greater than (-?[\d.]+)$/, (n) => `Use mais que ${n}`],
    [/^Number must be less than (-?[\d.]+)$/, (n) => `Use menos que ${n}`],
  ];
  for (const [padrao, texto] of porPadrao) {
    const achado = mensagem.match(padrao);
    if (achado) return texto(achado[1]);
  }

  // "Expected string, received number" e "Invalid enum value. Expected 'A' |
  // 'B', received 'C'" citam nomes de tipo do codigo; o que a pessoa precisa
  // saber e' so' que a opcao nao serve.
  if (/^Invalid enum value\./.test(mensagem)) return 'Opção inválida';
  if (/^Expected .+, received .+$/.test(mensagem)) return 'Valor inválido';

  return mensagem;
}

/**
 * Um campo que pode nao vir.
 *
 * Ausente, nulo e vazio dizem a mesma coisa -- "nao preenchi" -- e tem que
 * chegar no mesmo lugar. O padrao anterior, `.optional().or(z.literal(''))`,
 * aceitava os dois primeiros e recusava `null` com a mensagem mais inutil que o
 * Zod tem.
 *
 * E `null` chega com frequencia: e' o que `FormData.get` devolve para um campo
 * que nao esta' na tela, e e' o que um cliente escreve quando quer dizer
 * "vazio". Uma API que trata isso como erro culpa quem a chama por uma
 * distincao que ela mesma inventou.
 */
export function opcional<T extends ZodTypeAny>(schema: T) {
  return z.preprocess(
    (valor) => (valor === null || valor === '' ? undefined : valor),
    schema.optional(),
  );
}
