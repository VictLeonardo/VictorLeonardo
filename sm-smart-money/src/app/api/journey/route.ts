import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { loadQuestions, latestSubmission, saveSubmission } from '@/server/journey';
import { canRetake } from '@/lib/journey/scoring';

const schema = z.object({
  answers: z
    .array(z.object({ questionId: z.string(), optionIndex: z.number().int().min(0) }))
    .min(1),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Respostas inválidas' }, { status: 400 });
  }

  const last = await latestSubmission(user.id);
  if (last?.completedAt && !canRetake(last.completedAt)) {
    return NextResponse.json(
      { error: 'O diagnóstico só pode ser refeito 90 dias após a última conclusão.' },
      { status: 409 },
    );
  }

  // A pontuacao vem do banco, nunca do cliente: enviar `score` pelo body deixaria
  // o membro escolher o proprio resultado.
  const questions = await loadQuestions();
  const byId = new Map(questions.map((q) => [q.id, q]));

  const answers = parsed.data.answers.flatMap((answer) => {
    const question = byId.get(answer.questionId);
    if (!question) return [];
    const option = question.options[answer.optionIndex];
    if (!option) return [];
    return [
      {
        questionId: question.id,
        category: question.category,
        optionIndex: answer.optionIndex,
        score: option.score,
      },
    ];
  });

  if (answers.length !== questions.length) {
    return NextResponse.json({ error: 'Responda todas as perguntas' }, { status: 400 });
  }

  const submission = await saveSubmission(user.id, answers);
  return NextResponse.json({ ok: true, submissionId: submission.id });
}
