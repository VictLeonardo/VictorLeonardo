import type { Metadata } from 'next';
import { requireActiveMember } from '@/lib/auth/guards';
import { loadQuestions, latestSubmission, reportFor, submissionHistory } from '@/server/journey';
import { canRetake, daysUntilRetake } from '@/lib/journey/scoring';
import { JourneyWizard } from '@/components/portal/journey-wizard';
import { JourneyReportView } from '@/components/portal/journey-report';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Compass } from 'lucide-react';

export const metadata: Metadata = { title: 'Smart Money Journey' };
export const dynamic = 'force-dynamic';

export default async function JourneyPage({
  searchParams,
}: {
  searchParams: Promise<{ refazer?: string }>;
}) {
  const user = await requireActiveMember('/journey');
  const params = await searchParams;

  const [questions, last, history] = await Promise.all([
    loadQuestions(),
    latestSubmission(user.id),
    submissionHistory(user.id),
  ]);

  const retakeAllowed = canRetake(last?.completedAt ?? null);
  const wantsRetake = params.refazer === '1' && retakeAllowed;

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="Diagnóstico em preparação"
        description="O questionário do Smart Money Journey ainda não foi configurado pela equipe."
      />
    );
  }

  if (!last || wantsRetake) {
    return (
      <div className="space-y-7">
        <SectionHeader
          eyebrow="Diagnóstico"
          title="Smart Money Journey"
          description="Um raio-x da sua vida financeira em cinco dimensões. São poucas perguntas e o relatório fica salvo no seu perfil."
        />
        <JourneyWizard questions={questions} />
      </div>
    );
  }

  const report = reportFor(last.categoryScores);

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Diagnóstico"
        title="Smart Money Journey"
        description="Seu relatório mais recente, com pontos fortes, pontos de atenção e próximos passos."
      />
      <JourneyReportView
        report={report}
        completedAt={last.completedAt!.toISOString()}
        history={history.map((h) => ({
          id: h.id,
          completedAt: h.completedAt!.toISOString(),
          overallScore: h.overallScore ?? 0,
        }))}
        retake={{
          allowed: retakeAllowed,
          daysRemaining: last.completedAt ? daysUntilRetake(last.completedAt) : 0,
        }}
      />
    </div>
  );
}
