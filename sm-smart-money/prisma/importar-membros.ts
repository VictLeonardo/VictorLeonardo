import { readFileSync } from 'node:fs';
import { PrismaClient, type MemberStatus, type Plan } from '@prisma/client';
import { profileSlugFromName, telefoneBrasileiro } from '../src/lib/utils';

/**
 * Importa para a plataforma os membros exportados do sistema anterior.
 *
 * Roda em seco por padrao: sem CONFIRMAR=SIM ele le', valida, mostra o que faria
 * e nao escreve nada. E' a mesma postura do db:clean, pelo mesmo motivo -- o
 * alvo costuma ser producao.
 *
 *   npm run db:import -- caminho/do/arquivo.csv
 *   CONFIRMAR=SIM npm run db:import -- caminho/do/arquivo.csv
 *
 * Tres decisoes que valem registro:
 *
 * 1. NENHUM E-MAIL SAI DAQUI. Importar e convidar sao atos diferentes: o
 *    primeiro e' reversivel e silencioso, o segundo chega na caixa de entrada de
 *    dezenas de pessoas e nao volta atras. O convite e' passo separado, feito
 *    pelo painel quando voce decidir.
 *
 * 2. Quem ja' assina pelo Stripe nao e' tocado. O CSV e' a verdade da
 *    plataforma antiga; o Stripe e' a verdade da cobranca de hoje. Reimportar
 *    nao pode rebaixar para "Cancelado" alguem que acabou de pagar.
 *
 * 3. Dado duvidoso vira nulo, nunca um chute. Um telefone invalido guardado
 *    "quase certo" manda mensagem da comunidade para o numero de um estranho.
 */

const prisma = new PrismaClient();

const PLANOS: Record<string, Plan> = {
  'padrão': 'PADRAO',
  padrao: 'PADRAO',
  'com desconto': 'COM_DESCONTO',
  cortesia: 'CORTESIA',
};

const STATUS: Record<string, MemberStatus> = {
  ativo: 'ATIVO',
  cancelado: 'CANCELADO',
  pendente: 'PENDENTE',
};

/** Particulas que ficam em minuscula no meio do nome, como se escreve em portugues. */
const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du', 'del']);

/**
 * Leitor de CSV com aspas.
 *
 * Um `split(',')` quebraria em "CEO, Executive Director", que e' um campo so'.
 * Sao vinte linhas de maquina de estados contra uma dependencia nova.
 */
function lerCsv(texto: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let campo = '';
  let dentroDeAspas = false;

  const t = texto.replace(/^﻿/, '').replace(/\r\n?/g, '\n');

  for (let i = 0; i < t.length; i += 1) {
    const c = t[i];

    if (dentroDeAspas) {
      if (c !== '"') campo += c;
      else if (t[i + 1] === '"') {
        campo += '"';
        i += 1;
      } else dentroDeAspas = false;
      continue;
    }

    if (c === '"') dentroDeAspas = true;
    else if (c === ',') {
      linha.push(campo);
      campo = '';
    } else if (c === '\n') {
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else campo += c;
  }

  if (campo !== '' || linha.length > 0) {
    linha.push(campo);
    linhas.push(linha);
  }

  return linhas.filter((l) => l.some((v) => v.trim() !== ''));
}

/**
 * Corrige nome gritado em caixa alta.
 *
 * So' mexe em nome inteiramente maiusculo, que e' vicio de formulario antigo.
 * Nome com caixa mista ja' esta como a pessoa escreve o proprio nome, e ninguem
 * tem o direito de reescrever isso. Acentos ausentes ficam ausentes: adivinhar
 * "Jose" para "José" e' inventar dado de gente de verdade.
 */
function ajustaCaixa(nome: string): string {
  const letras = [...nome].filter((c) => /\p{L}/u.test(c));
  if (letras.length === 0 || !letras.every((c) => c === c.toUpperCase())) return nome;

  return nome
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
}

/** Data no formato brasileiro. Meio-dia UTC para nenhum fuso puxar para o dia anterior. */
function leData(bruto: string): Date | null {
  const m = bruto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dia, mes, ano] = m;
  const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia), 12));
  return Number.isNaN(data.getTime()) ? null : data;
}

type Registro = {
  linha: number;
  nome: string;
  email: string;
  jobTitle: string | null;
  phone: string | null;
  plan: Plan;
  status: MemberStatus;
  joinedAt: Date;
  perfilPublico: boolean;
};

async function main() {
  const caminho = process.argv[2];
  if (!caminho) {
    console.error('Informe o CSV:  npm run db:import -- caminho/do/arquivo.csv');
    process.exit(1);
  }

  const linhas = lerCsv(readFileSync(caminho, 'utf-8'));
  const [cabecalho, ...corpo] = linhas;
  const col = (nome: string) => cabecalho.findIndex((c) => c.trim() === nome);

  const iNome = col('Nome');
  const iCargo = col('Cargo/Título');
  const iEmail = col('E-mail');
  const iTel = col('Telefone');
  const iPlano = col('Plano');
  const iStatus = col('Status');
  const iData = col('Data de entrada');
  const iPerfil = col('Perfil Público');

  if ([iNome, iEmail, iPlano, iStatus, iData].some((i) => i < 0)) {
    console.error('Cabeçalho inesperado. Esperado: Nome, Cargo/Título, E-mail, Telefone, Plano, Status, Data de entrada, Perfil Público');
    console.error(`Encontrado: ${cabecalho.join(', ')}`);
    process.exit(1);
  }

  const registros: Registro[] = [];
  const erros: string[] = [];
  const avisos: string[] = [];
  const vistos = new Map<string, number>();

  corpo.forEach((l, idx) => {
    const numero = idx + 2; // +1 do cabecalho, +1 porque planilha conta do 1
    const nomeBruto = (l[iNome] ?? '').trim();
    const email = (l[iEmail] ?? '').trim().toLowerCase();

    if (!nomeBruto || !email) {
      erros.push(`linha ${numero}: nome ou e-mail vazio`);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      erros.push(`linha ${numero}: e-mail inválido (${email})`);
      return;
    }

    const anterior = vistos.get(email);
    if (anterior) {
      erros.push(`linha ${numero}: e-mail repetido, já usado na linha ${anterior} (${email})`);
      return;
    }
    vistos.set(email, numero);

    const plan = PLANOS[(l[iPlano] ?? '').trim().toLowerCase()];
    if (!plan) {
      erros.push(`linha ${numero}: plano desconhecido (${l[iPlano]})`);
      return;
    }

    const status = STATUS[(l[iStatus] ?? '').trim().toLowerCase()];
    if (!status) {
      erros.push(`linha ${numero}: status desconhecido (${l[iStatus]})`);
      return;
    }

    const joinedAt = leData(l[iData] ?? '');
    if (!joinedAt) {
      erros.push(`linha ${numero}: data de entrada inválida (${l[iData]})`);
      return;
    }

    const nome = ajustaCaixa(nomeBruto);
    if (nome !== nomeBruto) avisos.push(`nome ajustado: "${nomeBruto}" -> "${nome}"`);

    if ((l[iEmail] ?? '').trim() !== email) {
      avisos.push(`e-mail em minúscula: "${(l[iEmail] ?? '').trim()}" -> "${email}"`);
    }

    const tel = telefoneBrasileiro(l[iTel]);
    if (tel.motivo) {
      avisos.push(`telefone descartado (${nome}): "${(l[iTel] ?? '').trim()}" — ${tel.motivo}`);
    }

    registros.push({
      linha: numero,
      nome,
      email,
      jobTitle: (l[iCargo] ?? '').trim() || null,
      phone: tel.valor,
      plan,
      status,
      joinedAt,
      perfilPublico: (l[iPerfil] ?? '').trim().toLowerCase() === 'sim',
    });
  });

  const conta = <T extends string>(campo: (r: Registro) => T) => {
    const mapa = new Map<T, number>();
    for (const r of registros) mapa.set(campo(r), (mapa.get(campo(r)) ?? 0) + 1);
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  };

  console.log(`Arquivo: ${caminho}`);
  console.log(`Registros lidos: ${corpo.length}  |  válidos: ${registros.length}\n`);

  console.log('Por plano:');
  for (const [k, v] of conta((r) => r.plan)) console.log(`  ${k.padEnd(14)} ${v}`);
  console.log('Por status:');
  for (const [k, v] of conta((r) => r.status)) console.log(`  ${k.padEnd(14)} ${v}`);
  console.log(`Perfil público: ${registros.filter((r) => r.perfilPublico).length}`);
  console.log(`Sem telefone:   ${registros.filter((r) => !r.phone).length}`);

  if (avisos.length) {
    console.log(`\nAjustes aplicados (${avisos.length}):`);
    for (const a of avisos) console.log(`  - ${a}`);
  }

  if (erros.length) {
    console.log(`\nLinhas recusadas (${erros.length}):`);
    for (const e of erros) console.log(`  - ${e}`);
  }

  if (process.env.CONFIRMAR !== 'SIM') {
    console.log('\nNada foi gravado.');
    console.log(`Para importar de verdade:  CONFIRMAR=SIM npm run db:import -- ${caminho}`);
    return;
  }

  console.log('\nImportando...');
  let criados = 0;
  let atualizados = 0;
  let preservados = 0;

  for (const r of registros) {
    const existente = await prisma.user.findUnique({
      where: { email: r.email },
      select: { id: true, stripeSubscriptionId: true },
    });

    // Quem ja' passou pelo Stripe tem a verdade da cobranca no Stripe, nao no
    // CSV da plataforma antiga. Reimportar nao pode desfazer um pagamento.
    if (existente?.stripeSubscriptionId) {
      preservados += 1;
      continue;
    }

    const dados = {
      name: r.nome,
      jobTitle: r.jobTitle,
      phone: r.phone,
      plan: r.plan,
      status: r.status,
      joinedAt: r.joinedAt,
    };

    const user = existente
      ? await prisma.user.update({ where: { id: existente.id }, data: dados })
      : await prisma.user.create({ data: { ...dados, email: r.email, role: 'MEMBER' } });

    if (existente) atualizados += 1;
    else criados += 1;

    // O perfil nasce junto, como no cadastro pelo admin e no checkout, para o
    // endereco publico do membro existir desde o primeiro dia.
    const perfil = await prisma.profile.findUnique({ where: { userId: user.id } });
    if (perfil) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { isPublic: r.perfilPublico },
      });
    } else {
      const base = profileSlugFromName(r.nome) || 'membro';
      let slug = base;
      let n = 1;
      // Quatro pessoas chamadas "Ricardo Santos" viram ricardo-santos,
      // ricardo-santos-2, e assim por diante -- mesma regra do uniqueSlug.
      while (await prisma.profile.findUnique({ where: { slug }, select: { id: true } })) {
        n += 1;
        slug = `${base}-${n}`;
      }
      await prisma.profile.create({
        data: { userId: user.id, slug, isPublic: r.perfilPublico },
      });
    }
  }

  const totalMembros = await prisma.user.count({ where: { role: 'MEMBER' } });
  console.log('\nImportação concluída.');
  console.log(`  criados:     ${criados}`);
  console.log(`  atualizados: ${atualizados}`);
  if (preservados) console.log(`  preservados (já assinam pelo Stripe): ${preservados}`);
  console.log(`  membros na base agora: ${totalMembros}`);
  console.log('\nNenhum e-mail foi enviado. O convite de primeiro acesso é passo separado.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
