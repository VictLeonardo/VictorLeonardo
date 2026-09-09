import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { getTopic } from '@/server/community';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/ui/avatar';
import { ReplyForm } from '@/components/portal/reply-form';
import { TOPIC_CATEGORY_LABELS } from '@/lib/domain';
import { formatDate, relativeTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireActiveMember();
  const topic = await getTopic(id, user);
  return { title: topic?.title ?? 'Tópico' };
}

export default async function TopicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireActiveMember(`/comunidade/topico/${id}`);
  const topic = await getTopic(id, user);
  if (!topic) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/comunidade"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Comunidade
      </Link>

      <article className="rounded-lg border border-line bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{TOPIC_CATEGORY_LABELS[topic.category]}</Badge>
          {topic.pinned ? <Badge tone="info">Fixado</Badge> : null}
          {topic.isVip ? <Badge tone="brand">VIP</Badge> : null}
          {topic.closed ? <Badge tone="neutral">Fechado</Badge> : null}
        </div>

        <h1 className="mt-3 font-display text-2xl leading-tight text-text-1">{topic.title}</h1>

        <div className="mt-3 flex items-center gap-3">
          <MemberAvatar name={topic.author.name} src={topic.author.profile?.avatarUrl} size={38} />
          <div>
            <p className="text-sm font-medium text-text-1">
              {topic.author.profile?.isPublic && topic.author.profile.slug ? (
                <Link href={`/${topic.author.profile.slug}`} className="hover:underline">
                  {topic.author.name}
                </Link>
              ) : (
                topic.author.name
              )}
            </p>
            <p className="text-xs text-text-3">
              {topic.author.jobTitle ?? 'Membro'} · {formatDate(topic.createdAt, true)}
            </p>
          </div>
        </div>

        <div className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-text-1">
          {topic.body}
        </div>
      </article>

      <section aria-labelledby="respostas" className="space-y-4">
        <h2 id="respostas" className="text-sm font-semibold text-text-1">
          {topic.replies.length} resposta{topic.replies.length === 1 ? '' : 's'}
        </h2>

        {topic.replies.length > 0 ? (
          <ul className="space-y-3">
            {topic.replies.map((reply) => (
              <li key={reply.id}>
                <article className="flex gap-3 rounded-lg border border-line bg-surface p-4">
                  <MemberAvatar
                    name={reply.author.name}
                    src={reply.author.profile?.avatarUrl}
                    size={34}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-1">
                      {reply.author.profile?.isPublic && reply.author.profile.slug ? (
                        <Link href={`/${reply.author.profile.slug}`} className="hover:underline">
                          {reply.author.name}
                        </Link>
                      ) : (
                        reply.author.name
                      )}
                      <span className="ml-2 text-xs font-normal text-text-3">
                        {relativeTime(reply.createdAt)}
                      </span>
                    </p>
                    <div className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text-2">
                      {reply.body}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : null}

        {topic.closed ? (
          <p className="rounded-md border border-line bg-surface-sunken px-4 py-3 text-sm text-text-2">
            Este tópico foi fechado e não aceita novas respostas.
          </p>
        ) : (
          <ReplyForm topicId={topic.id} />
        )}
      </section>
    </div>
  );
}
