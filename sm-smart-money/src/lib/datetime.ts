/** `datetime-local` espera `YYYY-MM-DDTHH:mm` no fuso do navegador. */
export function toLocalInput(date: Date | null | undefined): string {
  if (!date) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
