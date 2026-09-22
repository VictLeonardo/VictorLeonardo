import type {
  ContentType,
  JourneyCategory,
  Plan,
  MemberStatus,
  NotificationAudience,
  Tier,
  TopicCategory,
  Visibility,
} from '@prisma/client';

/**
 * Vocabulario compartilhado entre portal e admin. Deixar os rotulos aqui evita
 * que a mesma enum apareca escrita de tres jeitos diferentes na interface.
 */

export const PLAN_LABELS: Record<Plan, string> = {
  PADRAO: 'Padrão',
  COM_DESCONTO: 'Com desconto',
  CORTESIA: 'Cortesia',
};

export const STATUS_LABELS: Record<MemberStatus, string> = {
  ATIVO: 'Ativo',
  CANCELADO: 'Cancelado',
  PENDENTE: 'Pendente',
};

export const TIER_LABELS: Record<Tier, string> = {
  VIP: 'VIP',
  ACADEMY: 'Academy',
};

/**
 * Quem alcanca cada conteudo. Os rotulos dizem "apenas" nos dois niveis porque
 * nao ha' hierarquia entre eles: marcar Academy tira o conteudo dos VIPs tanto
 * quanto marcar VIP o tira dos Academy.
 */
export const VISIBILITY_LABELS: Record<Visibility, string> = {
  TODOS: 'Todos os membros',
  VIP: 'Apenas VIP',
  ACADEMY: 'Apenas Academy',
};

/**
 * Para quem vai uma notificacao. Estava escrito em dois lugares -- a pagina e o
 * compositor --, cada um com um texto ligeiramente diferente para o mesmo
 * valor, e um deles ficou para tras quando o Academy entrou.
 */
export const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  TODOS: 'Todos os membros ativos',
  POR_PLANO: 'Segmento por plano',
  VIP: 'Somente VIP',
  ACADEMY: 'Somente Academy',
};

export function isVisibility(valor: unknown): valor is Visibility {
  return typeof valor === 'string' && valor in VISIBILITY_LABELS;
}

/**
 * Os tiers existentes, na ordem do enum.
 *
 * Vale como fonte porque `TIER_LABELS` e' `Record<Tier, string>`: acrescentar
 * um tier ao schema quebra a compilacao aqui ate' alguem dar um rotulo a ele.
 * Quem precisa validar ou listar tiers le' daqui em vez de repetir a lista --
 * foi uma lista repetida que fez o Academy nascer invisivel para a sessao.
 */
export const TIERS = Object.keys(TIER_LABELS) as Tier[];

export function isTier(valor: unknown): valor is Tier {
  return typeof valor === 'string' && valor in TIER_LABELS;
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  ARTIGO: 'Artigo',
  VIDEO: 'Vídeo',
  PODCAST: 'Podcast',
  ANALISE: 'Análise de mercado',
  EBOOK: 'E-book',
};

/** Rota do portal onde cada tipo de conteudo e' lido. */
export const CONTENT_TYPE_PATH: Record<ContentType, string> = {
  ARTIGO: '/conteudo',
  VIDEO: '/midia',
  PODCAST: '/midia',
  ANALISE: '/analises',
  EBOOK: '/ebooks',
};

export const ARTICLE_CATEGORIES = [
  'Tributário',
  'Investimentos',
  'Mercado',
  'Estratégia',
  'Comportamento',
] as const;

export const ANALYSIS_CATEGORIES = [
  'Macro',
  'Ações',
  'Fundos',
  'Câmbio',
  'Tributário',
  'Internacional',
] as const;

export const MEDIA_CATEGORIES = [
  'Investimentos',
  'Mercado',
  'Tributário',
  'Gestão',
  'Entrevista',
] as const;

export const EBOOK_CATEGORIES = [
  'Investimentos',
  'Planejamento',
  'Tributário',
  'Sucessão',
  'Proteção patrimonial',
] as const;

export function categoriesFor(type: ContentType): readonly string[] {
  switch (type) {
    case 'ARTIGO':
      return ARTICLE_CATEGORIES;
    case 'ANALISE':
      return ANALYSIS_CATEGORIES;
    case 'EBOOK':
      return EBOOK_CATEGORIES;
    default:
      return MEDIA_CATEGORIES;
  }
}

export const TOPIC_CATEGORY_LABELS: Record<TopicCategory, string> = {
  INVESTIMENTOS: 'Investimentos',
  MERCADO: 'Mercado',
  TRIBUTARIO: 'Tributário',
  REDES: 'Redes',
  OPORTUNIDADES: 'Oportunidades',
};

export const JOURNEY_CATEGORY_LABELS: Record<JourneyCategory, string> = {
  CONTROLE: 'Controle financeiro',
  INVESTIMENTOS: 'Investimentos',
  PROTECAO: 'Proteção patrimonial',
  TRIBUTACAO: 'Tributação',
  SUCESSAO: 'Sucessão',
};

export const JOURNEY_CATEGORY_ORDER: JourneyCategory[] = [
  'CONTROLE',
  'INVESTIMENTOS',
  'PROTECAO',
  'TRIBUTACAO',
  'SUCESSAO',
];

/**
 * Badge do perfil publico. A regra vem do mapeamento: parceiro tem precedencia
 * sobre tier, e tier sobre o plano comercial.
 */
export function publicBadge(user: { tier: Tier; isPartner: boolean }): string {
  if (user.isPartner) return 'SM PARTNER';
  return user.tier === 'ACADEMY' ? 'MEMBRO ACADEMY' : 'MEMBRO VIP';
}

/**
 * Valor mensal por plano, para o MRR estimado do dashboard admin.
 *
 * Isto e' fallback, nao fonte. O preco do plano padrao vive no Stripe e o
 * dashboard le' de la' (`precoMensalPadrao`); estes numeros so' entram em cena
 * quando a cobranca nao esta configurada, como em desenvolvimento.
 *
 * Cortesia e' zero por definicao. O plano com desconto e' negociado caso a caso
 * e nao passa pelo Stripe, entao continua sendo um numero de referencia -- e
 * ainda e' o numero herdado da plataforma antiga, nao o da cobranca atual.
 */
export const PLAN_MONTHLY_VALUE: Record<Plan, number> = {
  PADRAO: 37.9,
  COM_DESCONTO: 347,
  CORTESIA: 0,
};
