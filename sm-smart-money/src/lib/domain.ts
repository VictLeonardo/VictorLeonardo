import type { ContentType, JourneyCategory, Plan, MemberStatus, Tier, TopicCategory } from '@prisma/client';

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
  PADRAO: 'Padrão',
  VIP: 'VIP',
};

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
  if (user.tier === 'VIP') return 'MEMBRO VIP';
  return 'MEMBRO ESTRATÉGICO';
}

/** Valor mensal por plano, usado para estimar o MRR no dashboard admin. */
export const PLAN_MONTHLY_VALUE: Record<Plan, number> = {
  PADRAO: 497,
  COM_DESCONTO: 347,
  CORTESIA: 0,
};
