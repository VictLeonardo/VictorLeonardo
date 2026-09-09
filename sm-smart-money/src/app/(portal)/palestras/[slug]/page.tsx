import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarPlus, Clock, Radio } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { getLectureBySlug } from '@/server/lectures';
import { VideoPlayer } from '@/components/portal/media-player';
import { LectureCountdown } from '@/components/portal/lecture-countdown';
import { MemberAvatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateLong } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await requireActiveMember();
  const lecture = await getLectureBySlug(slug, user);
  return { title: lecture?.title ?? 'Palestra' };
}

export default async function LecturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireActiveMember(`/palestras/${slug}`);
  const lecture = await getLectureBySlug(slug, user);
  if (!lecture) notFound();

  const past = lecture.startsAt < new Date();
  const live = !past && lecture.liveUrl;

  return (
    <article className="space-y-7">
      <Link
        href="/palestras"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Palestras
      </Link>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{lecture.theme}</Badge>
          {lecture.visibility === 'VIP' ? <Badge tone="brand">VIP</Badge> : null}
          {past ? <Badge tone="neutral">Realizada</Badge> : <Badge tone="positive">Agendada</Badge>}
        </div>
        <h1 className="font-display text-3xl leading-tight text-text-1 sm:text-4xl">
          {lecture.title}
        </h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-2">
          <span className="first-letter:uppercase">{formatDateLong(lecture.startsAt)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {lecture.durationMin} minutos
          </span>
        </div>
      </header>

      {past && lecture.recordingUrl ? (
        <VideoPlayer url={lecture.recordingUrl} title={lecture.title} poster={lecture.coverUrl} />
      ) : past ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-surface-sunken p-8 text-center">
          <p className="text-sm text-text-2">
            A gravação desta palestra ainda está em edição. Ela aparece aqui assim que for publicada.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-surface p-6">
          <LectureCountdown startsAt={lecture.startsAt.toISOString()} />
          <div className="mt-5 flex flex-wrap gap-2">
            {live ? (
              <Button asChild>
                <a href={lecture.liveUrl!} target="_blank" rel="noreferrer">
                  <Radio className="size-4" aria-hidden="true" />
                  Entrar na transmissão
                </a>
              </Button>
            ) : null}
            <Button asChild variant="secondary">
              <a href={`/api/palestras/${lecture.slug}/ics`}>
                <CalendarPlus className="size-4" aria-hidden="true" />
                Adicionar ao calendário
              </a>
            </Button>
          </div>
        </div>
      )}

      {lecture.description ? (
        <div className="prose-sm-money max-w-3xl">
          <p>{lecture.description}</p>
        </div>
      ) : null}

      {lecture.speaker ? (
        <section
          aria-labelledby="speaker"
          className="rounded-lg border border-line bg-surface p-5"
        >
          <h2 id="speaker" className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong">
            Speaker
          </h2>
          <div className="mt-3 flex items-start gap-4">
            <MemberAvatar name={lecture.speaker.name} src={lecture.speaker.avatarUrl} size={56} />
            <div className="min-w-0">
              <p className="font-medium text-text-1">{lecture.speaker.name}</p>
              {lecture.speaker.jobTitle ? (
                <p className="text-sm text-text-2">{lecture.speaker.jobTitle}</p>
              ) : null}
              {lecture.speaker.bio ? (
                <p className="mt-2 text-sm leading-relaxed text-text-2">{lecture.speaker.bio}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
