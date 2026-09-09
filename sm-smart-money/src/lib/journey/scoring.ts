import type { JourneyCategory } from '@prisma/client';
import { JOURNEY_CATEGORY_LABELS, JOURNEY_CATEGORY_ORDER } from '@/lib/domain';

/**
 * Motor de pontuacao do Smart Money Journey.
 *
 * Cada questao oferece opcoes com score de 0 a 4. A nota da categoria e' a soma
 * obtida sobre a soma maxima possivel, normalizada em 0-100 — assim categorias
 * com numeros diferentes de perguntas continuam comparaveis entre si. O Smart
 * Money Score geral e' a media simples das categorias respondidas.
 */

export const MAX_OPTION_SCORE = 4;

export type JourneyOption = { label: string; score: number };

export type AnswerInput = {
  questionId: string;
  category: JourneyCategory;
  optionIndex: number;
  score: number;
};

export type CategoryScores = Partial<Record<JourneyCategory, number>>;

export function computeCategoryScores(answers: AnswerInput[]): CategoryScores {
  const totals = new Map<JourneyCategory, { sum: number; count: number }>();

  for (const answer of answers) {
    const current = totals.get(answer.category) ?? { sum: 0, count: 0 };
    current.sum += answer.score;
    current.count += 1;
    totals.set(answer.category, current);
  }

  const scores: CategoryScores = {};
  for (const [category, { sum, count }] of totals) {
    scores[category] = Math.round((sum / (count * MAX_OPTION_SCORE)) * 100);
  }
  return scores;
}

export function computeOverallScore(scores: CategoryScores): number {
  const values = Object.values(scores).filter((v): v is number => typeof v === 'number');
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export type ScoreBand = 'inicial' | 'em-desenvolvimento' | 'consistente' | 'avancado';

export function bandFor(score: number): ScoreBand {
  if (score < 40) return 'inicial';
  if (score < 60) return 'em-desenvolvimento';
  if (score < 80) return 'consistente';
  return 'avancado';
}

export const BAND_LABELS: Record<ScoreBand, string> = {
  inicial: 'Estagio inicial',
  'em-desenvolvimento': 'Em desenvolvimento',
  consistente: 'Consistente',
  avancado: 'Avançado',
};

/** Recomendacoes por categoria, escolhidas conforme a faixa de pontuacao. */
const RECOMMENDATIONS: Record<JourneyCategory, Record<ScoreBand, string>> = {
  CONTROLE: {
    inicial:
      'Estruture um fluxo de caixa pessoal separado do fluxo da empresa e registre todas as entradas e saidas por 90 dias.',
    'em-desenvolvimento':
      'Consolide os lancamentos num único painel mensal e defina uma reserva de emergência equivalente a 6 meses de custo fixo.',
    consistente:
      'Passe do controle para a projeção: monte um orçamento rolante de 12 meses com cenários de receita.',
    avancado:
      'Automatize a consolidação patrimonial e revise trimestralmente os indicadores de liquidez.',
  },
  INVESTIMENTOS: {
    inicial:
      'Defina objetivos por horizonte de tempo antes de escolher produtos, e documente sua politica de investimento.',
    'em-desenvolvimento':
      'Reduza a concentração em uma única classe e estabeleca bandas de rebalanceamento.',
    consistente:
      'Avalie exposição internacional e o custo total da carteira, incluindo taxas de administração e performance.',
    avancado:
      'Revise a fronteira de risco com testes de estresse e avalie veículos exclusivos para eficiência de custo.',
  },
  PROTECAO: {
    inicial:
      'Levante os riscos que hoje comprometeriam o patrimônio e contrate as coberturas básicas de vida e saude.',
    'em-desenvolvimento':
      'Separe patrimônio pessoal e empresarial e avalie a blindagem via holding patrimonial.',
    consistente:
      'Revise coberturas e limites anualmente e formalize acordos societários com cláusulas de saída.',
    avancado:
      'Considere estruturas internacionais e seguros de vida como instrumento de liquidez sucessória.',
  },
  TRIBUTACAO: {
    inicial:
      'Mapeie a carga tributária efetiva sobre a renda e o patrimônio antes de qualquer decisão de investimento.',
    'em-desenvolvimento':
      'Compare regimes de tributação da pessoa jurídica e simule o impacto da distribuição de lucros.',
    consistente:
      'Avalie o come-cotas e a eficiência dos veículos atuais frente a alternativas isentas ou diferidas.',
    avancado:
      'Modele o custo tributário da sucessão e antecipe movimentos diante de mudanças legislativas.',
  },
  SUCESSAO: {
    inicial:
      'Formalize um inventário do patrimônio e discuta com a família o destino pretendido de cada ativo.',
    'em-desenvolvimento':
      'Elabore testamento e avalie doação em vida com reserva de usufruto.',
    consistente:
      'Estruture a holding familiar com governança definida e regras claras de sucessão na gestão.',
    avancado:
      'Implemente protocolo familiar e revise a estrutura diante do cenário tributário vigente.',
  },
};

export type JourneyReport = {
  overallScore: number;
  band: ScoreBand;
  categoryScores: CategoryScores;
  strengths: { category: JourneyCategory; label: string; score: number }[];
  attentionPoints: { category: JourneyCategory; label: string; score: number }[];
  nextSteps: { category: JourneyCategory; label: string; recommendation: string }[];
};

/**
 * Monta o relatorio final. Pontos fortes sao categorias com 70+; pontos de
 * atencao, abaixo de 55. Os proximos passos priorizam as tres notas mais baixas,
 * que e' onde o membro tem mais a ganhar.
 */
export function buildReport(scores: CategoryScores): JourneyReport {
  const overallScore = computeOverallScore(scores);
  const entries = JOURNEY_CATEGORY_ORDER.filter((c) => typeof scores[c] === 'number').map((c) => ({
    category: c,
    label: JOURNEY_CATEGORY_LABELS[c],
    score: scores[c] as number,
  }));

  const strengths = entries.filter((e) => e.score >= 70).sort((a, b) => b.score - a.score);
  const attentionPoints = entries.filter((e) => e.score < 55).sort((a, b) => a.score - b.score);

  const nextSteps = [...entries]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((e) => ({
      category: e.category,
      label: e.label,
      recommendation: RECOMMENDATIONS[e.category][bandFor(e.score)],
    }));

  return { overallScore, band: bandFor(overallScore), categoryScores: scores, strengths, attentionPoints, nextSteps };
}

/** Intervalo minimo para refazer o diagnostico e medir evolucao. */
export const RETAKE_DAYS = 90;

export function canRetake(lastCompletedAt: Date | null): boolean {
  if (!lastCompletedAt) return true;
  const elapsed = Date.now() - lastCompletedAt.getTime();
  return elapsed >= RETAKE_DAYS * 24 * 60 * 60 * 1000;
}

export function daysUntilRetake(lastCompletedAt: Date): number {
  const elapsedDays = (Date.now() - lastCompletedAt.getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(RETAKE_DAYS - elapsedDays));
}
