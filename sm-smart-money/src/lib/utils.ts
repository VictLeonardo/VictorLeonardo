import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { FUSO_DA_PLATAFORMA } from '@/lib/datetime';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Remove acentos, pontuacao e espacos — base dos slugs de perfil e conteudo. */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Slug de perfil publico: primeiro nome + ultimo sobrenome, como na plataforma
 * atual (smboard.com.br/victor-leonardo).
 */
export function profileSlugFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return slugify(parts[0]);
  return slugify(`${parts[0]} ${parts[parts.length - 1]}`);
}

/**
 * Host do ambiente, sem protocolo, para exibir ao usuario ("smboard.com.br/ana").
 * Sai da configuracao e nao do codigo: a mesma imagem serve localhost, staging e
 * producao sem rebuild.
 */
export function appHost(appUrl: string): string {
  try {
    return new URL(appUrl).host;
  } catch {
    return appUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
  }
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Cor estavel derivada do nome, para avatares sem foto. */
export function avatarHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return hash;
}

export function greetingFor(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function formatDate(value: Date | string | null | undefined, withTime = false): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  // Sem `timeZone` o Intl adota o fuso de quem formata -- UTC no servidor,
  // o do visitante no navegador --, e o mesmo registro aparecia com horas
  // diferentes conforme onde foi renderizado.
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_DA_PLATAFORMA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

export function formatDateLong(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_DA_PLATAFORMA,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Estimativa de leitura a partir do HTML do editor (200 palavras/minuto). */
export function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

/** Mantem apenas digitos — formato aceito pela WAHA (`5511999999999`). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** DDDs que existem no Brasil. Separa telefone de campo preenchido errado. */
const DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42,
  43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74,
  75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/**
 * Telefone brasileiro no formato que a WAHA usa: 55 + DDD + numero.
 *
 * Devolve nulo, com motivo, quando o valor nao e' um telefone plausivel. Isso e'
 * deliberado: guardar um numero "quase certo" faz a comunidade mandar mensagem
 * para o celular de um estranho, e e' pior do que nao ter numero nenhum.
 *
 * Vive aqui, e nao no importador onde nasceu, porque o telefone passou a entrar
 * por dois caminhos -- a planilha da migracao e o checkout do Stripe -- e duas
 * nocoes diferentes de "valido" divergiriam na primeira correcao.
 */
export function telefoneBrasileiro(bruto: string | null | undefined): {
  valor: string | null;
  motivo?: string;
} {
  const digitos = normalizePhone(bruto ?? '');
  if (!digitos) return { valor: null };

  // O 55 inicial so' e' codigo de pais quando sobra numero demais para ser DDD.
  const local = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos;

  if (local.length !== 10 && local.length !== 11) {
    return { valor: null, motivo: `${local.length} dígitos (esperado 10 ou 11)` };
  }
  if (!DDDS.has(Number(local.slice(0, 2)))) {
    return { valor: null, motivo: `DDD ${local.slice(0, 2)} não existe` };
  }
  if (local.length === 11 && local[2] !== '9') {
    return { valor: null, motivo: 'celular de 11 dígitos deveria ter 9 após o DDD' };
  }

  return { valor: `55${local}` };
}

/**
 * A forma comparavel de um telefone brasileiro.
 *
 * O WhatsApp reporta celular brasileiro ora com o nono digito, ora sem: linhas
 * antigas costumam aparecer sem ele, porque o 9 foi acrescentado pelas
 * operadoras depois. Comparar texto com texto recusaria um membro pagante por
 * causa de um digito que ele nunca escolheu ter.
 *
 * A chave e' 55 + DDD + os oito digitos finais -- os mesmos nas duas formas.
 * Isso confunde um fixo com um celular que terminem igual no mesmo DDD, o que
 * nao acontece na pratica porque fixo nao comeca com 9 nem com 8.
 */
export function chaveDeTelefone(bruto: string | null | undefined): string | null {
  const digitos = normalizePhone(bruto ?? '');
  if (!digitos) return null;

  // O 55 inicial so' e' codigo de pais quando sobra numero demais para ser DDD
  // -- o DDD 55 existe (Santa Maria, RS) e nao pode ser comido por engano.
  const local = digitos.startsWith('55') && digitos.length > 11 ? digitos.slice(2) : digitos;
  if (local.length !== 10 && local.length !== 11) return null;

  const ddd = local.slice(0, 2);
  if (!DDDS.has(Number(ddd))) return null;
  // Mesma regra de `telefoneBrasileiro`: celular de 11 digitos tem 9 apos o
  // DDD. Sem ela, um numero impossivel como 11 8876-54321 cairia na mesma
  // chave de um numero real -- e dois cadastros diferentes casariam.
  if (local.length === 11 && local[2] !== '9') return null;

  return `55${ddd}${local.slice(-8)}`;
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const digits = normalizePhone(phone);
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return phone;
}

export function relativeTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days}d`;
  return formatDate(date);
}
