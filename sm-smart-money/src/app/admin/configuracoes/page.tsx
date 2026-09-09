import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { mailConfigured, wahaConfigured } from '@/lib/env';
import { SectionHeader } from '@/components/ui/section-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TemplateEditor } from '@/components/admin/template-editor';

export const metadata: Metadata = { title: 'Configurações' };
export const dynamic = 'force-dynamic';

/** Templates que o sistema espera existir; a lista alimenta o editor. */
const EXPECTED_TEMPLATES = [
  { channel: 'EMAIL' as const, key: 'boas-vindas', name: 'E-mail de boas-vindas' },
  { channel: 'EMAIL' as const, key: 'cancelamento', name: 'E-mail de cancelamento' },
  { channel: 'EMAIL' as const, key: 'nova-palestra', name: 'E-mail de nova palestra' },
  { channel: 'WHATSAPP' as const, key: 'lembrete-palestra', name: 'Lembrete de palestra' },
  { channel: 'WHATSAPP' as const, key: 'novo-conteudo', name: 'Aviso de novo conteúdo' },
];

export default async function AdminSettingsPage() {
  await requireAdmin('/admin/configuracoes');

  const saved = await prisma.messageTemplate.findMany();
  const byKey = new Map(saved.map((t) => [`${t.channel}:${t.key}`, t]));

  const templates = EXPECTED_TEMPLATES.map((expected) => {
    const existing = byKey.get(`${expected.channel}:${expected.key}`);
    return {
      channel: expected.channel,
      key: expected.key,
      name: existing?.name ?? expected.name,
      subject: existing?.subject ?? '',
      body: existing?.body ?? '',
      updatedAt: existing?.updatedAt?.toISOString() ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Sistema"
        title="Configurações"
        description="Estado das integrações e templates das mensagens automáticas."
      />

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-text-1">Integrações</h2>
          <p className="mt-1 text-sm text-text-2">
            Configuradas por variável de ambiente. Sem elas, os envios ficam apenas registrados no
            log — o fluxo continua funcionando em desenvolvimento.
          </p>

          <dl className="mt-4 space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <dt className="text-sm font-medium text-text-1">E-mail transacional (Zoho)</dt>
                <dd className="text-xs text-text-3">
                  SMTP_HOST · SMTP_USER · SMTP_PASSWORD
                </dd>
              </div>
              <Badge tone={mailConfigured ? 'positive' : 'warning'}>
                {mailConfigured ? 'Configurado' : 'Não configurado'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
              <div>
                <dt className="text-sm font-medium text-text-1">WhatsApp (WAHA)</dt>
                <dd className="text-xs text-text-3">WAHA_BASE_URL · WAHA_API_KEY · WAHA_SESSION</dd>
              </div>
              <Badge tone={wahaConfigured ? 'positive' : 'warning'}>
                {wahaConfigured ? 'Configurado' : 'Não configurado'}
              </Badge>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <dt className="text-sm font-medium text-text-1">Rotinas agendadas</dt>
                <dd className="text-xs text-text-3">
                  CRON_SECRET protege /api/cron/waha-health e /api/cron/agendamentos
                </dd>
              </div>
              <Badge tone={process.env.CRON_SECRET ? 'positive' : 'warning'}>
                {process.env.CRON_SECRET ? 'Configurado' : 'Não configurado'}
              </Badge>
            </div>
          </dl>
        </CardContent>
      </Card>

      <TemplateEditor templates={templates} />
    </div>
  );
}
