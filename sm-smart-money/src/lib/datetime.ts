/**
 * Conversao entre instante e hora de parede, sempre no fuso da comunidade.
 *
 * A plataforma nao pode usar o fuso de quem executa. No servidor da Vercel isso
 * e' UTC, no navegador e' o do visitante, e o mesmo registro aparecia com horas
 * diferentes conforme o lugar em que foi renderizado. Pior: o admin digitava
 * 19:00 pensando em Brasilia, o valor era lido como 19:00 UTC, e a palestra
 * chegava no calendario do membro as 16:00.
 *
 * Aqui o fuso e' fixo e explicito. A zona IANA, e nao um deslocamento de -03:00,
 * porque o Brasil ja' teve horario de verao e pode voltar a ter -- a zona
 * acompanha, o deslocamento fixo nao.
 */
export const FUSO_DA_PLATAFORMA = 'America/Sao_Paulo';

/** Deslocamento do fuso da plataforma, em minutos, no instante dado. */
function deslocamentoEmMinutos(instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSO_DA_PLATAFORMA,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instante);

  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  // `hour12: false` devolve 24 para meia-noite em algumas versoes do ICU.
  const parede = Date.UTC(
    valor('year'),
    valor('month') - 1,
    valor('day'),
    valor('hour') % 24,
    valor('minute'),
    valor('second'),
  );

  return (parede - instante.getTime()) / 60_000;
}

/**
 * Instante em que o relogio de Brasilia marca a data-hora informada.
 *
 * Recebe o que sai de um campo `datetime-local` ou `date` -- "2026-09-16T19:00"
 * ou "2026-09-16" --, que nao carrega fuso nenhum. Sem esta funcao, o
 * `new Date` trataria como hora local de quem interpreta.
 */
export function fromLocalInput(local: string): Date {
  if (!local) return new Date(NaN);

  const comHora = local.includes('T') ? local : `${local}T00:00`;
  const completo = comHora.length === 16 ? `${comHora}:00` : comHora;
  // Primeiro le' os numeros de parede como se fossem UTC, para ter referencia.
  const comoSeUtc = new Date(`${completo}Z`);
  if (Number.isNaN(comoSeUtc.getTime())) return comoSeUtc;

  const estimativa = new Date(comoSeUtc.getTime() - deslocamentoEmMinutos(comoSeUtc) * 60_000);
  // Segunda passada: em fuso com horario de verao o deslocamento pode diferir
  // entre a estimativa e o instante final. Custa uma linha e fecha a borda.
  return new Date(comoSeUtc.getTime() - deslocamentoEmMinutos(estimativa) * 60_000);
}

/**
 * Hora de parede de Brasilia no formato que `datetime-local` espera.
 *
 * E' o caminho de volta do `fromLocalInput`: o campo de edicao precisa mostrar
 * a mesma hora que o admin digitou, nao a hora do servidor.
 */
export function toLocalInput(date: Date | null | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return '';
  const parede = new Date(date.getTime() + deslocamentoEmMinutos(date) * 60_000);
  return parede.toISOString().slice(0, 16);
}
