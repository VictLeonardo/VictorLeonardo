import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarPlus, Compass, Sparkles } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { listContent, viewedIdsFor } from '@/server/content';
import { getNextLecture } from '@/server/lectures';
import { ContentCard } from '@/components/portal/content-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { CONTENT_TYPE_PATH } from '@/lib/domain';
import { firstName, formatDateLong, greetingFor } from '@/lib/utils';
import { LectureCountdown } from '@/components/portal/lecture-countdown';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

const WELCOME_WINDOW_DAYS = 7;

/**
 * O relógio fica fora do corpo do componente: ler a hora durante a renderização
 * torna o resultado não determinístico para o mesmo conjunto de props.
 */
function daysSince(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
}

export default async function DashboardPage() {
  const user = await requireActiveMember('/dashboard');

  const [nextLecture, recent, journey, member] = await Promise.all([
    getNextLecture(user),
    listContent({
      user,
      types: ['ARTIGO', 'VIDEO', 'PODCAST', 'ANALISE', 'EBOOK'],
      take: 6,
    }),
    prisma.journeySubmission.findFirst({
      where: { userId: user.id, completedAt: { not: null } },
      orderBy: { completedAt: 'desc' },
      select: { overallScore: true, completedAt: true },
    }),
    prisma.user.findUnique({ where: { id: user.id }, select: { joinedAt: true } }),
  ]);

  const viewed = await viewedIdsFor(
    user.id,
    recent.items.map((i) => i.id),
  );

  const isNewMember = member ? daysSince(member.joinedAt) <= WELCOME_WINDOW_DAYS : false;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text-1 sm:text-3xl">
          {greetingFor()}, {firstName(user.name)}
        </h1>
        <p className="text-sm text-text-2">
          Aqui está o que a comunidade produziu nos últimos dias.
        </p>
      </header>

      {isNewMember ? (
        <Card className="border-brand/40 bg-brand-soft">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-1">Bem-vindo a SM Smart Money</p>
                <p className="mt-0.5 text-sm text-text-2">
                  Comece completando seu perfil e o diagnóstico Smart Money Journey — leva cerca de
                  8 minutos.
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <Link href="/perfil">Completar perfil</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {nextLecture ? (
        <section aria-labelledby="proxima-palestra">
          <h2 id="proxima-palestra" className="sr-only">
            Próxima palestra
          </h2>
          <Card className="overflow-hidden">
            <div className="grid gap-0 md:grid-cols-[1.4fr_1fr]">
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
                  Próxima palestra
                </p>
                <h3 className="mt-2 font-display text-2xl leading-tight text-text-1">
                  {nextLecture.title}
                </h3>
                <p className="mt-2 text-sm text-text-2 first-letter:uppercase">
                  {formatDateLong(nextLecture.startsAt)}
                </p>
                {nextLecture.speaker ? (
                  <p className="mt-1 text-sm text-text-2">
                    com <span className="font-medium text-text-1">{nextLecture.speaker.name}</span>
                    {nextLecture.speaker.jobTitle ? ` · ${nextLecture.speaker.jobTitle}` : ''}
                  </p>
                ) : null}

                <LectureCountdown startsAt={nextLecture.startsAt.toISOString()} className="mt-5" />

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={`/palestras/${nextLecture.slug}`}>
                      Acessar palestra
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <a href={`/api/palestras/${nextLecture.slug}/ics`}>
                      <CalendarPlus className="size-4" aria-hidden="true" />
                      Adicionar ao calendário
                    </a>
                  </Button>
                </div>
              </div>

              <div className="relative hidden min-h-48 bg-surface-sunken md:block">
                {nextLecture.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- capa vem de storage externo
                  <img src={nextLecture.coverUrl} alt="" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center bg-gradient-to-br from-brand-soft to-surface-sunken">
                    <span className="font-display text-5xl text-brand-strong/40">SM</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      {!journey ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Compass className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden="true" />
              <div>
                <p className="font-medium text-text-1">Smart Money Journey pendente</p>
                <p className="mt-0.5 text-sm text-text-2">
                  Descubra seu Smart Money Score e receba os próximos passos para o seu patrimônio.
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/journey">Iniciar diagnóstico</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-text-3">
                Seu Smart Money Score
              </p>
              <p className="mt-1 text-3xl font-semibold leading-none text-text-1">
                {journey.overallScore}
                <span className="text-base font-normal text-text-3">/100</span>
              </p>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <Link href="/journey">Ver relatório completo</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="conteudos-recentes" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <h2 id="conteudos-recentes" className="text-lg font-semibold text-text-1">
            Publicado recentemente
          </h2>
          <Link href="/conteudo" className="text-sm text-brand-strong hover:underline">
            Ver tudo
          </Link>
        </div>

        {recent.items.length === 0 ? (
          <EmptyState
            title="Nenhuma publicação ainda"
            description="Assim que a equipe publicar o primeiro conteúdo, ele aparece aqui."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.items.map((item) => (
              <ContentCard
                key={item.id}
                item={{ ...item, viewed: viewed.has(item.id) }}
                href={`${CONTENT_TYPE_PATH[item.type]}/${item.slug}`}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
