import 'server-only';
import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/lib/audit';
import { chaveDeTelefone } from '@/lib/utils';

/** Quem decidiu, na auditoria. O agente nao tem conta: `id` nulo de proposito. */
const AGENTE = { id: null, name: 'Agente do WhatsApp' };

export type Decisao =
  | { decisao: 'aprovar'; membro: { id: string; nome: string } }
  | { decisao: 'aguardar'; motivo: string };

/**
 * Decide se um numero que pediu entrada no grupo deve ser aceito.
 *
 * Aprova so' quem tem cadastro ativo na plataforma com aquele telefone. Nao
 * recusa ninguem automaticamente: um numero desconhecido fica esperando um
 * humano, porque a causa mais provavel nao e' um invasor -- e' telefone
 * cadastrado errado, ou a pessoa pedindo de um segundo aparelho. Recusar
 * sozinho fecharia a porta para um cliente pagante sem ninguem ficar sabendo.
 *
 * Cada decisao vai para a auditoria, inclusive as de esperar: sem isso, "por
 * que fulano nao entrou?" nao tem resposta.
 */
export async function decidirEntrada(params: {
  telefone: string;
  grupoId: string;
  metodo?: string | null;
}): Promise<Decisao> {
  const chave = chaveDeTelefone(params.telefone);

  const registrar = async (decisao: Decisao, extra: Record<string, unknown> = {}) => {
    await recordAudit({
      actor: AGENTE,
      action: decisao.decisao === 'aprovar' ? 'grupo.entrada_aprovada' : 'grupo.entrada_pendente',
      entity: 'grupo',
      entityId: params.grupoId,
      metadata: {
        telefone: params.telefone,
        chave,
        metodo: params.metodo ?? null,
        ...(decisao.decisao === 'aprovar'
          ? { membroId: decisao.membro.id, membro: decisao.membro.nome }
          : { motivo: decisao.motivo }),
        ...extra,
      },
    });
    return decisao;
  };

  if (!chave) {
    return registrar({ decisao: 'aguardar', motivo: 'Telefone fora do formato brasileiro' });
  }

  // O casamento e' pela chave, que ignora o nono digito; o banco guarda o
  // numero como veio. Filtrar pelos oito digitos finais reduz a busca, e a
  // conferencia final e' da chave inteira -- DDD incluido.
  const candidatos = await prisma.user.findMany({
    where: { phone: { endsWith: chave.slice(-8) } },
    select: { id: true, name: true, status: true, phone: true, role: true },
  });
  const casaram = candidatos.filter((c) => chaveDeTelefone(c.phone) === chave);

  if (casaram.length === 0) {
    return registrar({ decisao: 'aguardar', motivo: 'Nenhum cadastro com esse telefone' });
  }
  if (casaram.length > 1) {
    return registrar(
      { decisao: 'aguardar', motivo: 'Mais de um cadastro com esse telefone' },
      { cadastros: casaram.map((c) => c.id) },
    );
  }

  const membro = casaram[0];
  if (membro.status !== 'ATIVO') {
    return registrar({
      decisao: 'aguardar',
      motivo: membro.status === 'CANCELADO' ? 'Cadastro cancelado' : 'Cadastro ainda pendente',
    });
  }

  return registrar({ decisao: 'aprovar', membro: { id: membro.id, nome: membro.name } });
}
