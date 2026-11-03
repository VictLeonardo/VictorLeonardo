import 'server-only';
import { prisma } from '@/lib/prisma';
import { env } from '@/lib/env';
import { preencherModelo } from '@/lib/modelo';
import { sendWhatsappMessage } from '@/lib/whatsapp';

/** Usado quando o admin ainda nao escreveu o texto em Configuracoes. */
const PADRAO =
  'Olá, {{primeiro_nome}}! Sua assinatura da SM Smart Money está ativa. ' +
  'Entre no grupo da comunidade por aqui: {{link}}\n\n' +
  'Peça para entrar com este mesmo número e sua entrada é liberada na hora.';

export const CHAVE_DO_TEMPLATE = 'convite-grupo';

/**
 * Manda o convite do grupo para quem acabou de pagar.
 *
 * O link e' o mesmo `WHATSAPP_GROUP_URL` que o e-mail de boas-vindas e o botao
 * do portal ja' usam. Uma segunda variavel para o mesmo endereco divergiria na
 * primeira vez que o grupo trocasse de link, e metade dos avisos passaria a
 * apontar para um convite morto.
 *
 * Ele nao vem da Z-API: pedir o link no momento do pagamento amarraria a
 * confirmacao da assinatura a mais um servico de pe'. Em troca, trocar o link
 * do grupo exige atualizar a variavel -- a tela de Configuracoes avisa disso.
 *
 * Nunca lanca: isto roda dentro do webhook do Stripe, e uma excecao aqui faria
 * o Stripe repetir a confirmacao inteira e criar o membro duas vezes. Falhar o
 * convite e' ruim; duplicar o cadastro de quem pagou e' pior.
 */
export async function enviarConviteDoGrupo(membro: {
  id: string;
  name: string;
  phone: string | null;
}): Promise<{ ok: boolean; motivo?: string }> {
  try {
    if (!env.WHATSAPP_GROUP_URL) {
      return { ok: false, motivo: 'Link do grupo não configurado' };
    }
    if (!membro.phone) {
      return { ok: false, motivo: 'Membro sem telefone' };
    }

    const salvo = await prisma.messageTemplate.findUnique({
      where: { channel_key: { channel: 'WHATSAPP', key: CHAVE_DO_TEMPLATE } },
      select: { body: true },
    });

    const mensagem = preencherModelo(salvo?.body?.trim() || PADRAO, {
      nome: membro.name,
      link: env.WHATSAPP_GROUP_URL,
    });

    return await sendWhatsappMessage({
      phone: membro.phone,
      message: mensagem,
      kind: CHAVE_DO_TEMPLATE,
      userId: membro.id,
    });
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : String(erro);
    console.error('[convite-grupo] falhou', motivo);
    return { ok: false, motivo };
  }
}
