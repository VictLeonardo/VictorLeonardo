import type { Metadata } from 'next';
import Link from 'next/link';
import type { TopicCategory } from '@prisma/client';
import { MessageSquare, Users } from 'lucide-react';
import { requireActiveMember } from '@/lib/auth/guards';
import { listDirectory, listTopics, specialtiesInUse } from '@/server/community';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { MemberAvatar } from '@/components/ui/avatar';
import { FilterBar } from '@/components/portal/filter-bar';
import { NewTopicButton } from '@/components/portal/new-topic';
import { WhatsappCta } from '@/components/portal/whatsapp-cta';
import { CommunityTabs } from '@/components/portal/community-tabs';
import { TOPIC_CATEGORY_LABELS, publicBadge } from '@/lib/domain';
import { relativeTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Comunidade VIP' };
export const dynamic = 'force-dynamic';

const CATEGORIES: TopicCategory[] = [
  'INVESTIMENTOS',
  'MERCADO',
  'TRIBUTARIO',
  'REDES',
  'OPORTUNIDADES',
];

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; categoria?: string; q?: string; especialidade?: string }>;
}) {
  const user = await requireActiveMember('/comunidade');
  const params = await searchParams;
  const tab = params.aba === 'diretorio' ? 'diretorio' : 'forum';

  const category = CATEGORIES.includes(params.categoria as TopicCategory)
    ? (params.categoria as TopicCategory)
    : undefined;

  const [topics, directory, specialties] = await Promise.all([
    tab === 'forum' ? listTopics({ user, category, search: params.q }) : Promise.resolve([]),
    tab === 'diretorio'
      ? listDirectory({ search: params.q, specialty: params.especialidade })
      : Promise.resolve([]),
    tab === 'diretorio' ? specialtiesInUse() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Rede"
        title="Comunidade VIP"
        description="Discussões, oportunidades e o diretório completo de membros da SM Smart Money."
        actions={tab === 'forum' ? <NewTopicButton canPostVip={user.tier === 'VIP' || user.role === 'ADMIN'} /> : undefined}
      >
        <div className="flex flex-col gap-4">
          <CommunityTabs active={tab} />
          {tab === 'forum' ? (
            <FilterBar
              basePath="/comunidade"
              searchParam="q"
              searchPlaceholder="Buscar tópico"
              groups={[
                {
                  param: 'categoria',
                  label: 'Categoria',
                  value: category ?? '',
                  options: [
                    { value: '', label: 'Todas' },
                    ...CATEGORIES.map((c) => ({ value: c, label: TOPIC_CATEGORY_LABELS[c] })),
                  ],
                },
              ]}
            />
          ) : (
            <FilterBar
              basePath="/comunidade?aba=diretorio"
              searchParam="q"
              searchPlaceholder="Buscar por nome, cargo ou empresa"
              groups={[
                {
                  param: 'especialidade',
                  label: 'Área de atuação',
                  value: params.especialidade ?? '',
                  options: [
                    { value: '', label: 'Todas' },
                    ...specialties.map((s) => ({ value: s, label: s })),
                  ],
                },
              ]}
            />
          )}
        </div>
      </SectionHeader>

      {tab === 'forum' ? (
        topics.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Nenhum tópico por aqui"
            description="Seja o primeiro a abrir uma discussão nesta categoria."
          />
        ) : (
          <ul className="space-y-3">
            {topics.map((topic) => (
              <li key={topic.id}>
                <article className="group relative flex gap-4 rounded-lg border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-pop">
                  <MemberAvatar
                    name={topic.author.name}
                    src={topic.author.profile?.avatarUrl}
                    size={40}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{TOPIC_CATEGORY_LABELS[topic.category]}</Badge>
                      {topic.pinned ? <Badge tone="info">Fixado</Badge> : null}
                      {topic.isVip ? <Badge tone="brand">VIP</Badge> : null}
                      {topic.closed ? <Badge tone="neutral">Fechado</Badge> : null}
                    </div>
                    <h2 className="mt-2 text-base font-semibold leading-snug text-text-1">
                      <Link
                        href={`/comunidade/topico/${topic.id}`}
                        className="after:absolute after:inset-0"
                      >
                        {topic.title}
                      </Link>
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm text-text-2">{topic.body}</p>
                    <p className="mt-2 text-xs text-text-3">
                      {topic.author.name}
                      {topic.author.jobTitle ? ` · ${topic.author.jobTitle}` : ''} ·{' '}
                      {relativeTime(topic.createdAt)} · {topic._count.replies} resposta
                      {topic._count.replies === 1 ? '' : 's'}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )
      ) : directory.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro encontrado"
          description="Ajuste a busca ou o filtro de área de atuação."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {directory.map((member) => {
            const linkable = member.profile?.isPublic && member.profile.slug;
            return (
              <li key={member.id}>
                <article className="group relative flex h-full flex-col gap-3 rounded-lg border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-pop">
                  <div className="flex items-start gap-3">
                    <MemberAvatar name={member.name} src={member.profile?.avatarUrl} size={44} />
                    <div className="min-w-0">
                      <h2 className="truncate font-medium text-text-1">
                        {linkable ? (
                          <Link
                            href={`/${member.profile!.slug}`}
                            className="after:absolute after:inset-0"
                          >
                            {member.name}
                          </Link>
                        ) : (
                          member.name
                        )}
                      </h2>
                      {member.jobTitle ? (
                        <p className="truncate text-sm text-text-2">{member.jobTitle}</p>
                      ) : null}
                      {member.company ? (
                        <p className="truncate text-xs text-text-3">{member.company}</p>
                      ) : null}
                    </div>
                  </div>

                  <Badge tone={member.isPartner || member.tier === 'VIP' ? 'brand' : 'neutral'}>
                    {publicBadge(member)}
                  </Badge>

                  {member.profile?.specialties.length ? (
                    <ul className="mt-auto flex flex-wrap gap-1 pt-1">
                      {member.profile.specialties.slice(0, 3).map((s) => (
                        <li
                          key={s}
                          className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-text-2"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <WhatsappCta />
    </div>
  );
}
