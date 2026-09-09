import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarPlus, Clock, Video } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { listLectures, lectureThemes } from '@/server/lectures';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LectureCountdown } from '@/components/portal/lecture-countdown';
import { MemberAvatar } from '@/components/ui/avatar';
import { FilterBar } from '@/components/portal/filter-bar';
import { formatDate, formatDateLong } from '@/lib/utils';

export const metadata: Metadata = { title: 'Palestras' };
export const dynamic = 'force-dynamic';

type Scope = 'proximas' | 'realizadas' | 'todas';

export default async function LecturesPage({
  searchParams,
}: {
  searchParams: Promise<{ escopo?: string; tema?: string }>;
}) {
  const user = await requireActiveMember('/palestras');
  const params = await searchParams;
  const scope: Scope =
    params.escopo === 'realizadas' ? 'realizadas' : params.escopo === 'todas' ? 'todas' : 'proximas';

  const [lectures, themes] = await Promise.all([
    listLectures(user, scope, params.tema),
    lectureThemes(user),
  ]);

  const next = scope === 'proximas' ? lectures[0] : null;
  const rest = next ? lectures.slice(1) : lectures;

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Agenda"
        title="Palestras"
        description="Encontros ao vivo com especialistas e o acervo completo das sessões já realizadas."
      >
        <FilterBar
          basePath="/palestras"
          groups={[
            {
              param: 'escopo',
              label: 'Exibir',
              value: scope,
              options: [
                { value: 'proximas', label: 'Próximas' },
                { value: 'realizadas', label: 'Realizadas' },
                { value: 'todas', label: 'Todas' },
              ],
            },
            ...(themes.length > 0
              ? [
                  {
                    param: 'tema',
                    label: 'Tema',
                    value: params.tema ?? '',
                    options: [
                      { value: '', label: 'Todos os temas' },
                      ...themes.map((t) => ({ value: t, label: t })),
                    ],
                  },
                ]
              : []),
          ]}
        />
      </SectionHeader>

      {next ? (
        <article className="overflow-hidden rounded-lg border border-brand/40 bg-surface shadow-card">
          <div className="grid md:grid-cols-[1.5fr_1fr]">
            <div className="p-6">
              <Badge tone="brand">Próxima palestra</Badge>
              <h2 className="mt-3 font-display text-2xl leading-tight text-text-1">
                <Link href={`/palestras/${next.slug}`} className="hover:underline">
                  {next.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-text-2 first-letter:uppercase">{formatDateLong(next.startsAt)}</p>
              {next.description ? (
                <p className="mt-3 line-clamp-3 text-sm text-text-2">{next.description}</p>
              ) : null}

              {next.speaker ? (
                <div className="mt-4 flex items-center gap-3">
                  <MemberAvatar name={next.speaker.name} src={next.speaker.avatarUrl} size={40} />
                  <div>
                    <p className="text-sm font-medium text-text-1">{next.speaker.name}</p>
                    <p className="text-xs text-text-3">{next.speaker.jobTitle}</p>
                  </div>
                </div>
              ) : null}

              <LectureCountdown startsAt={next.startsAt.toISOString()} className="mt-5" />

              <div className="mt-5 flex flex-wrap gap-2">
                <Button asChild>
                  <Link href={`/palestras/${next.slug}`}>Ver detalhes</Link>
                </Button>
                <Button asChild variant="secondary">
                  <a href={`/api/palestras/${next.slug}/ics`}>
                    <CalendarPlus className="size-4" aria-hidden="true" />
                    Adicionar ao calendário
                  </a>
                </Button>
              </div>
            </div>
            <div className="relative hidden min-h-52 bg-surface-sunken md:block">
              {next.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- capa vem de storage externo
                <img src={next.coverUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center bg-gradient-to-br from-brand-soft to-surface-sunken">
                  <span className="font-display text-5xl text-brand-strong/40">SM</span>
                </div>
              )}
            </div>
          </div>
        </article>
      ) : null}

      {rest.length === 0 && !next ? (
        <EmptyState
          icon={Video}
          title="Nenhuma palestra neste filtro"
          description="Ajuste o filtro acima ou volte em breve — a agenda é atualizada toda semana."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((lecture) => {
            const past = lecture.startsAt < new Date();
            return (
              <li key={lecture.id}>
                <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-shadow hover:shadow-pop">
                  <div className="relative aspect-[16/9] bg-surface-sunken">
                    {lecture.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- capa vem de storage externo
                      <img
                        src={lecture.coverUrl}
                        alt=""
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-gradient-to-br from-brand-soft to-surface-sunken">
                        <span className="font-display text-3xl text-brand-strong/40">SM</span>
                      </div>
                    )}
                    {lecture.visibility === 'VIP' ? (
                      <Badge tone="brand" className="absolute left-3 top-3 bg-surface/95">
                        VIP
                      </Badge>
                    ) : null}
                    {past && lecture.recordingUrl ? (
                      <Badge tone="neutral" className="absolute right-3 top-3 bg-surface/95">
                        Gravação
                      </Badge>
                    ) : null}
                  </div>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-brand-strong">
                      {lecture.theme}
                    </p>
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-text-1">
                      <Link href={`/palestras/${lecture.slug}`} className="after:absolute after:inset-0">
                        {lecture.title}
                      </Link>
                    </h3>
                    {lecture.speaker ? (
                      <p className="text-sm text-text-2">{lecture.speaker.name}</p>
                    ) : null}
                    <div className="mt-auto flex items-center gap-2 pt-2 text-xs text-text-3">
                      <span>{formatDate(lecture.startsAt, true)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" aria-hidden="true" />
                        {lecture.durationMin} min
                      </span>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
