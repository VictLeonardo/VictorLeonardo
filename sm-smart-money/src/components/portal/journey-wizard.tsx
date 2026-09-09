'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress';
import { useToast } from '@/components/ui/toast';
import { JOURNEY_CATEGORY_LABELS } from '@/lib/domain';
import { cn } from '@/lib/utils';
import type { QuestionRow } from '@/server/journey';

/**
 * Questionario passo a passo. Uma pergunta por tela mantem o foco e deixa a barra
 * de progresso honesta; as respostas ficam em memoria e so' vao ao servidor no
 * final, onde a pontuacao e' recalculada a partir do banco.
 */
export function JourneyWizard({ questions }: { questions: QuestionRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, number>>({});
  const [pending, setPending] = React.useState(false);

  const question = questions[step];
  const selected = answers[question.id];
  const isLast = step === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  function choose(index: number) {
    setAnswers((prev) => ({ ...prev, [question.id]: index }));
  }

  async function submit() {
    setPending(true);
    const res = await fetch('/api/journey', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: questions.map((q) => ({ questionId: q.id, optionIndex: answers[q.id] })),
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      toast(payload.error ?? 'Não foi possível salvar o diagnóstico', 'error');
      return;
    }

    toast('Diagnóstico concluido. Veja seu relatório.', 'success');
    router.replace('/journey');
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-brand-strong">
            {JOURNEY_CATEGORY_LABELS[question.category]}
          </span>
          <span className="tabular-nums text-text-3">
            {step + 1} de {questions.length}
          </span>
        </div>
        <ProgressBar
          value={answeredCount}
          max={questions.length}
          label={`Progresso do diagnóstico: ${answeredCount} de ${questions.length} respondidas`}
        />
      </div>

      <fieldset className="rounded-lg border border-line bg-surface p-6">
        <legend className="sr-only">{question.prompt}</legend>
        <h2 className="text-lg font-semibold leading-snug text-text-1">{question.prompt}</h2>
        {question.helpText ? (
          <p className="mt-1.5 text-sm text-text-2">{question.helpText}</p>
        ) : null}

        <div className="mt-5 space-y-2">
          {question.options.map((option, index) => {
            const active = selected === index;
            return (
              <label
                key={option.label}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3.5 transition-colors',
                  active
                    ? 'border-brand bg-brand-soft'
                    : 'border-line hover:border-line-strong hover:bg-surface-sunken',
                )}
              >
                <input
                  type="radio"
                  name={question.id}
                  checked={active}
                  onChange={() => choose(index)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--color-brand-strong)]"
                />
                <span className={cn('text-sm leading-relaxed', active ? 'text-text-1' : 'text-text-2')}>
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Voltar
        </Button>

        {isLast ? (
          <Button
            onClick={() => void submit()}
            disabled={selected === undefined || answeredCount < questions.length || pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            Concluir diagnostico
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)} disabled={selected === undefined}>
            Próxima
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
    </div>
  );
}
