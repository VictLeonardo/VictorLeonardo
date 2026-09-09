import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { getMemberDetail, memberActivity } from '@/server/members';
import { reportFor } from '@/server/journey';
import { MemberAvatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PlanBadge, StatusBadge, TierBadge } from '@/components/ui/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { BarList } from '@/components/charts/bar-list';
import { MemberActions } from '@/components/admin/member-actions';
import { MemberEditForm } from '@/components/admin/member-edit-form';
import { CONTENT_TYPE_LABELS, JOURNEY_CATEGORY_LABELS, publicBadge } from '@/lib/domain';
import { formatDate, formatPhone } from '@/lib/utils';
import type { JourneyCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const member = await getMemberDetail(id);
  return { title: member ? `${member.name} · Membros` : 'Membro' };
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const member = await getMemberDetail(id);
  if (!member) notFound();

  const activity = await memberActivity(id);
  const lastJourney = member.journeySubmissions[0];
  const report = lastJourney ? reportFor(lastJourney.categoryScores) : null;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/membros"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Membros
      </Link>

      <header className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-5 shadow-card sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <MemberAvatar name={member.name} src={member.profile?.avatarUrl} size={64} />
          <div className="min-w-0 space-y-1.5">
            <h1 className="text-2xl font-semibold text-text-1">{member.name}</h1>
            <p className="text-sm text-text-2">
              {member.jobTitle ?? 'Cargo não informado'}
              {member.company ? ` · ${member.company}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <StatusBadge status={member.status} />
              <PlanBadge plan={member.plan} />
              <TierBadge tier={member.tier} />
              {member.isPartner ? <Badge tone="brand">SM Partner</Badge> : null}
            </div>
          </div>
        </div>

        <MemberActions
          member={{
            id: member.id,
            name: member.name,
            email: member.email,
            phone: member.phone,
            status: member.status,
          }}
        />
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <MemberEditForm
            member={{
              id: member.id,
              name: member.name,
              phone: member.phone,
              jobTitle: member.jobTitle,
              company: member.company,
              plan: member.plan,
              status: member.status,
              tier: member.tier,
              isPartner: member.isPartner,
            }}
          />

          {report && lastJourney ? (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-sm font-semibold text-text-1">Smart Money Journey</h2>
                  <span className="text-xs text-text-3">
                    Concluido em {formatDate(lastJourney.completedAt)}
                  </span>
                </div>

                <p className="mt-3 text-4xl font-semibold leading-none text-text-1">
                  {lastJourney.overallScore}
                  <span className="ml-1 text-base font-normal text-text-3">/100</span>
                </p>

                <ul className="mt-4 space-y-2.5">
                  {Object.entries(report.categoryScores).map(([category, score]) => (
                    <li key={category}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text-2">
                          {JOURNEY_CATEGORY_LABELS[category as JourneyCategory] ?? category}
                        </span>
                        <span className="font-medium tabular-nums text-text-1">{score}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${score}%`,
                            backgroundColor: 'var(--color-chart-1)',
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>

                {member.journeySubmissions.length > 1 ? (
                  <p className="mt-4 text-xs text-text-3">
                    {member.journeySubmissions.length} diagnosticos registrados. Anteriores:{' '}
                    {member.journeySubmissions
                      .slice(1)
                      .map((s) => `${s.overallScore} (${formatDate(s.completedAt)})`)
                      .join(', ')}
                    .
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-text-1">Smart Money Journey</h2>
                <p className="mt-2 text-sm text-text-2">
                  Este membro ainda não concluiu o diagnóstico.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-text-1">Histórico de comunicações</h2>
              {member.emailLogs.length === 0 && member.whatsappLogs.length === 0 ? (
                <p className="mt-2 text-sm text-text-2">Nenhuma comunicação registrada.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="text-xs text-text-3">
                      <tr>
                        <th scope="col" className="border-b border-line py-2 pr-4 font-medium">
                          Canal
                        </th>
                        <th scope="col" className="border-b border-line py-2 pr-4 font-medium">
                          Assunto
                        </th>
                        <th scope="col" className="border-b border-line py-2 pr-4 font-medium">
                          Status
                        </th>
                        <th scope="col" className="border-b border-line py-2 font-medium">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {member.emailLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="border-b border-line py-2.5 pr-4 text-text-2">E-mail</td>
                          <td className="border-b border-line py-2.5 pr-4 text-text-1">
                            {log.subject}
                          </td>
                          <td className="border-b border-line py-2.5 pr-4">
                            <Badge tone={log.status === 'ENVIADO' ? 'positive' : 'danger'}>
                              {log.status === 'ENVIADO' ? 'Enviado' : 'Falhou'}
                            </Badge>
                          </td>
                          <td className="border-b border-line py-2.5 tabular-nums text-text-2">
                            {formatDate(log.sentAt, true)}
                          </td>
                        </tr>
                      ))}
                      {member.whatsappLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="border-b border-line py-2.5 pr-4 text-text-2">WhatsApp</td>
                          <td className="border-b border-line py-2.5 pr-4 text-text-1">
                            {log.message.slice(0, 60)}
                            {log.message.length > 60 ? '...' : ''}
                          </td>
                          <td className="border-b border-line py-2.5 pr-4">
                            <Badge tone={log.status === 'ENVIADO' ? 'positive' : 'danger'}>
                              {log.status === 'ENVIADO' ? 'Enviado' : 'Falhou'}
                            </Badge>
                          </td>
                          <td className="border-b border-line py-2.5 tabular-nums text-text-2">
                            {formatDate(log.sentAt, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-3 p-5 text-sm">
              <h2 className="text-sm font-semibold text-text-1">Contato e cadastro</h2>
              <dl className="space-y-2.5">
                <div>
                  <dt className="text-xs text-text-3">E-mail</dt>
                  <dd className="break-all text-text-1">{member.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-3">WhatsApp</dt>
                  <dd className="tabular-nums text-text-1">{formatPhone(member.phone)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-3">Entrada</dt>
                  <dd className="text-text-1">{formatDate(member.joinedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-3">Último login</dt>
                  <dd className="text-text-1">{formatDate(member.lastLoginAt, true)}</dd>
                </div>
                {member.canceledAt ? (
                  <div>
                    <dt className="text-xs text-text-3">Cancelamento</dt>
                    <dd className="text-danger">{formatDate(member.canceledAt)}</dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold text-text-1">Perfil público</h2>
              {member.profile ? (
                <>
                  <p className="break-all rounded-md bg-surface-sunken px-3 py-2 font-mono text-xs text-text-2">
                    /{member.profile.slug}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={member.profile.isPublic ? 'positive' : 'neutral'}>
                      {member.profile.isPublic ? 'Ativo' : 'Privado'}
                    </Badge>
                    <Badge tone={member.isPartner || member.tier === 'VIP' ? 'brand' : 'neutral'}>
                      {publicBadge(member)}
                    </Badge>
                  </div>
                  {member.profile.inviteSentAt ? (
                    <p className="text-xs text-text-3">
                      Convite enviado em {formatDate(member.profile.inviteSentAt)}
                    </p>
                  ) : (
                    <p className="text-xs text-text-3">Nenhum convite enviado.</p>
                  )}
                  <Link
                    href={`/${member.profile.slug}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 text-xs text-brand-strong hover:underline"
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" />
                    Abrir perfil
                  </Link>
                </>
              ) : (
                <p className="text-sm text-text-2">Perfil ainda não criado.</p>
              )}
            </CardContent>
          </Card>

          {activity.sections.length > 0 ? (
            <BarList
              title="Seções mais acessadas"
              subtitle={`${activity.viewCount} conteúdos visualizados`}
              data={activity.sections}
              valueLabel="Acessos"
            />
          ) : null}

          {activity.recentViews.length > 0 ? (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-text-1">Últimos conteúdos vistos</h2>
                <ul className="mt-3 divide-y divide-[var(--color-line)]">
                  {activity.recentViews.map((view) => (
                    <li key={`${view.content.slug}-${view.viewedAt.toISOString()}`} className="py-2">
                      <p className="truncate text-sm text-text-1">{view.content.title}</p>
                      <p className="text-xs text-text-3">
                        {CONTENT_TYPE_LABELS[view.content.type]} · {formatDate(view.viewedAt)}
                        {view.completed ? ' · concluido' : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
