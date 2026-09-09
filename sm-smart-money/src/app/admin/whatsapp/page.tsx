import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { getWahaStatus, WAHA_STATE_LABELS } from '@/lib/waha';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { WahaControls } from '@/components/admin/waha-controls';
import { formatDate, formatPhone } from '@/lib/utils';

export const metadata: Metadata = { title: 'WhatsApp' };
export const dynamic = 'force-dynamic';

export default async function AdminWhatsappPage() {
  await requireAdmin('/admin/whatsapp');

  const [status, logs, lastChecks] = await Promise.all([
    getWahaStatus(),
    prisma.whatsappLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: 40,
      select: {
        id: true,
        phone: true,
        kind: true,
        message: true,
        status: true,
        error: true,
        sentAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.wahaHealthCheck.findMany({ orderBy: { checkedAt: 'desc' }, take: 10 }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Integração"
        title="WhatsApp (WAHA)"
        description="Estado da instância, reconexao por QR Code e histórico de disparos."
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-text-1">Instância</h2>
                <Badge tone={status.connected ? 'positive' : 'danger'}>
                  {WAHA_STATE_LABELS[status.state] ?? status.state}
                </Badge>
              </div>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-text-3">Sessão</dt>
                  <dd className="font-mono text-sm text-text-1">
                    {process.env.WAHA_SESSION ?? 'default'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-3">Número vinculado</dt>
                  <dd className="tabular-nums text-sm text-text-1">
                    {status.phone ? formatPhone(status.phone) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-3">Estado bruto</dt>
                  <dd className="font-mono text-sm text-text-1">{status.state}</dd>
                </div>
              </dl>

              {status.detail ? (
                <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                  {status.detail}
                </p>
              ) : null}

              {!status.configured ? (
                <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
                  Defina <code className="font-mono">WAHA_BASE_URL</code> no ambiente para habilitar
                  a integração. Sem ela, os disparos ficam apenas registrados no log.
                </p>
              ) : null}

              <WahaControls connected={status.connected} configured={status.configured} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-text-1">Últimos disparos</h2>

              {logs.length === 0 ? (
                <p className="mt-3 text-sm text-text-2">Nenhuma mensagem enviada ainda.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs text-text-3">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Destinatário
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Tipo
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Mensagem
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Status
                        </th>
                        <th scope="col" className="py-2 text-right font-medium">
                          Data
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-line last:border-0">
                          <td className="py-2.5 pr-4">
                            <p className="text-text-1">{log.user?.name ?? '—'}</p>
                            <p className="text-xs tabular-nums text-text-3">
                              {formatPhone(log.phone)}
                            </p>
                          </td>
                          <td className="py-2.5 pr-4 text-text-2">{log.kind}</td>
                          <td className="max-w-64 truncate py-2.5 pr-4 text-text-2">
                            {log.message}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge tone={log.status === 'ENVIADO' ? 'positive' : 'danger'}>
                              {log.status === 'ENVIADO' ? 'Enviado' : 'Falhou'}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-text-2">
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

        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-text-1">Health checks</h2>
            <p className="mt-1 text-sm text-text-2">
              A rota de cron verifica a instância periodicamente e alerta o admin por e-mail quando
              ela cai.
            </p>

            {lastChecks.length === 0 ? (
              <p className="mt-3 text-sm text-text-3">Nenhuma verificação registrada ainda.</p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--color-line)]">
                {lastChecks.map((check) => (
                  <li key={check.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-xs tabular-nums text-text-2">
                      {formatDate(check.checkedAt, true)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Badge tone={check.connected ? 'positive' : 'danger'}>
                        {check.connected ? 'OK' : 'Offline'}
                      </Badge>
                      {check.alertSent ? <Badge tone="info">Alerta</Badge> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
