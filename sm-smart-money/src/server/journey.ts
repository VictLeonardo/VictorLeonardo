import 'server-only';
import type { JourneyCategory } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { JOURNEY_CATEGORY_ORDER } from '@/lib/domain';
import {
  buildReport,
  computeCategoryScores,
  computeOverallScore,
  type AnswerInput,
  type CategoryScores,
  type JourneyOption,
} from '@/lib/journey/scoring';

export type QuestionRow = {
  id: string;
  category: JourneyCategory;
  order: number;
  prompt: string;
  helpText: string | null;
  options: JourneyOption[];
};

export async function loadQuestions(): Promise<QuestionRow[]> {
  const rows = await prisma.journeyQuestion.findMany({
    where: { active: true },
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  });

  const byCategory = new Map<JourneyCategory, QuestionRow[]>();
  for (const row of rows) {
    const question: QuestionRow = {
      id: row.id,
      category: row.category,
      order: row.order,
      prompt: row.prompt,
      helpText: row.helpText,
      options: row.options as unknown as JourneyOption[],
    };
    byCategory.set(row.category, [...(byCategory.get(row.category) ?? []), question]);
  }

  // Ordem fixa das categorias: o membro percorre do controle a sucessao.
  return JOURNEY_CATEGORY_ORDER.flatMap((category) => byCategory.get(category) ?? []);
}

export async function latestSubmission(userId: string) {
  return prisma.journeySubmission.findFirst({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
  });
}

export async function submissionHistory(userId: string, take = 5) {
  return prisma.journeySubmission.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
    take,
    select: { id: true, completedAt: true, overallScore: true, categoryScores: true },
  });
}

/** Grava respostas e o relatorio derivado numa unica transacao. */
export async function saveSubmission(userId: string, answers: AnswerInput[]) {
  const categoryScores = computeCategoryScores(answers);
  const overallScore = computeOverallScore(categoryScores);

  return prisma.$transaction(async (tx) => {
    const submission = await tx.journeySubmission.create({
      data: {
        userId,
        completedAt: new Date(),
        overallScore,
        categoryScores: categoryScores as object,
      },
    });

    await tx.journeyAnswer.createMany({
      data: answers.map((a) => ({
        submissionId: submission.id,
        questionId: a.questionId,
        optionIndex: a.optionIndex,
        score: a.score,
      })),
    });

    return submission;
  });
}

export function reportFor(categoryScores: unknown) {
  return buildReport((categoryScores ?? {}) as CategoryScores);
}
