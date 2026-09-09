import 'server-only';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth/session';

/**
 * Registro append-only de acoes administrativas (G11). Nenhuma rota da aplicacao
 * atualiza ou apaga linhas desta tabela; o admin so consegue ler em /admin/auditoria.
 */
export type AuditAction =
  | 'membro.criar'
  | 'membro.atualizar'
  | 'membro.cancelar'
  | 'membro.reativar'
  | 'membro.excluir'
  | 'membro.reset_senha'
  | 'membro.email_manual'
  | 'perfil.convite_enviar'
  | 'perfil.convite_lote'
  | 'conteudo.criar'
  | 'conteudo.atualizar'
  | 'conteudo.publicar'
  | 'conteudo.arquivar'
  | 'conteudo.excluir'
  | 'palestra.criar'
  | 'palestra.atualizar'
  | 'palestra.excluir'
  | 'notificacao.criar'
  | 'notificacao.disparar'
  | 'whatsapp.reiniciar'
  | 'whatsapp.desconectar'
  | 'whatsapp.mensagem'
  | 'template.atualizar'
  | 'configuracao.atualizar';

export async function recordAudit(params: {
  actor: SessionUser | { id: string; name: string };
  action: AuditAction;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  let ip: string | null = null;
  try {
    const h = await headers();
    ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
  } catch {
    ip = null;
  }

  await prisma.auditLog.create({
    data: {
      actorId: params.actor.id,
      actorName: params.actor.name,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      metadata: (params.metadata ?? {}) as object,
      ip,
    },
  });
}

/** Rotulos legiveis para a tela de auditoria. */
export const AUDIT_LABELS: Record<string, string> = {
  'membro.criar': 'Criou membro',
  'membro.atualizar': 'Atualizou membro',
  'membro.cancelar': 'Cancelou membro',
  'membro.reativar': 'Reativou membro',
  'membro.excluir': 'Excluiu membro',
  'membro.reset_senha': 'Gerou link de reset de senha',
  'membro.email_manual': 'Enviou e-mail manual',
  'perfil.convite_enviar': 'Enviou convite de perfil',
  'perfil.convite_lote': 'Disparou convites em massa',
  'conteudo.criar': 'Criou conteúdo',
  'conteudo.atualizar': 'Atualizou conteúdo',
  'conteudo.publicar': 'Publicou conteúdo',
  'conteudo.arquivar': 'Arquivou conteúdo',
  'conteudo.excluir': 'Excluiu conteúdo',
  'palestra.criar': 'Criou palestra',
  'palestra.atualizar': 'Atualizou palestra',
  'palestra.excluir': 'Excluiu palestra',
  'notificacao.criar': 'Criou notificação',
  'notificacao.disparar': 'Disparou notificação',
  'whatsapp.reiniciar': 'Reiniciou instância WAHA',
  'whatsapp.desconectar': 'Desconectou instância WAHA',
  'whatsapp.mensagem': 'Enviou mensagem WhatsApp',
  'template.atualizar': 'Atualizou template',
  'configuracao.atualizar': 'Atualizou configuração',
};
