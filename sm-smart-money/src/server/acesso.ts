import 'server-only';
import { cache } from 'react';
import type { Tier } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { PORTAL_NAV } from '@/lib/navigation';
import { TIERS, isTier } from '@/lib/domain';

/**
 * Quais telas do portal cada tier enxerga.
 *
 * A lista de telas sai de `PORTAL_NAV`, nao de uma copia: uma tela nova aparece
 * aqui sozinha, liberada para todos, e nao fica esquecida fora da matriz.
 *
 * Perfil e assinatura ficam de fora de proposito. Sao as telas da pessoa sobre
 * ela mesma -- trocar a foto, ver a propria cobranca, cancelar --, e trancar
 * alguem para fora delas nao restringe conteudo, so' impede que resolva a
 * propria situacao.
 */

export const CHAVE_MATRIZ = 'acesso.telas';

export type MatrizDeAcesso = Record<string, Tier[]>;

export const TELAS = PORTAL_NAV.map((item) => ({ href: item.href, label: item.label }));

/** Tudo liberado para todos: e' o que a plataforma sempre fez. */
export function matrizPadrao(): MatrizDeAcesso {
  return Object.fromEntries(TELAS.map((t) => [t.href, [...TIERS]]));
}

/**
 * Le' o que esta gravado por cima do padrao.
 *
 * Comeca do padrao e so' sobrescreve tela conhecida com tier conhecido. Assim
 * uma linha antiga, com uma tela que nao existe mais ou um tier removido, e'
 * ignorada em vez de virar um bloqueio que ninguem entende. E uma tela ausente
 * da linha continua liberada -- o lado seguro aqui e' o de deixar passar: quem
 * paga e nao consegue abrir o portal e' um problema maior do que quem ve' uma
 * tela a mais, e o conteudo VIP continua filtrado por conta propria.
 */
export const lerMatriz = cache(async (): Promise<MatrizDeAcesso> => {
  const matriz = matrizPadrao();

  const linha = await prisma.setting.findUnique({ where: { key: CHAVE_MATRIZ } });
  const gravado = linha?.value;
  if (!gravado || typeof gravado !== 'object' || Array.isArray(gravado)) return matriz;

  for (const [href, tiers] of Object.entries(gravado as Record<string, unknown>)) {
    if (!(href in matriz) || !Array.isArray(tiers)) continue;
    matriz[href] = tiers.filter(isTier);
  }
  return matriz;
});

export async function gravarMatriz(matriz: MatrizDeAcesso): Promise<void> {
  // Normaliza antes de gravar: so' telas que existem, so' tiers que existem, e
  // sem repeticao. O que entra no banco e' exatamente o que sai dele.
  const limpa: MatrizDeAcesso = {};
  for (const tela of TELAS) {
    const pedidos = matriz[tela.href] ?? [];
    limpa[tela.href] = TIERS.filter((t) => pedidos.includes(t));
  }

  await prisma.setting.upsert({
    where: { key: CHAVE_MATRIZ },
    create: { key: CHAVE_MATRIZ, value: limpa },
    update: { value: limpa },
  });
}

/**
 * A qual tela do menu um caminho pertence.
 *
 * `/analises/relatorio-de-outubro` pertence a `/analises`: restringir a lista
 * sem restringir o que ela abre nao restringe nada.
 */
export function telaDe(href: string): string | null {
  const caminho = href.split('?')[0];
  const tela = TELAS.find((t) => caminho === t.href || caminho.startsWith(`${t.href}/`));
  return tela?.href ?? null;
}

/** Telas que este tier abre, na ordem do menu. */
export function telasLiberadas(matriz: MatrizDeAcesso, tier: Tier): string[] {
  return TELAS.filter((t) => matriz[t.href]?.includes(tier)).map((t) => t.href);
}

export function podeAbrir(matriz: MatrizDeAcesso, href: string, tier: Tier): boolean {
  const tela = telaDe(href);
  // Caminho fora do menu (perfil, assinatura, journey de terceiros) nao e'
  // governado por esta matriz.
  if (!tela) return true;
  return matriz[tela]?.includes(tier) ?? true;
}
