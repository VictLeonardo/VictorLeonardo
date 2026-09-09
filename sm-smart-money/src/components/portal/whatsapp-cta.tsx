import { MessageCircle } from 'lucide-react';

/**
 * O grupo de WhatsApp continua existindo como canal complementar. O CTA fica no
 * rodape da comunidade — presente, mas nao como porta de entrada.
 */
export function WhatsappCta() {
  const url = process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL;
  if (!url) return null;

  return (
    <aside className="flex flex-col gap-3 rounded-lg border border-line bg-surface-sunken p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MessageCircle className="mt-0.5 size-5 shrink-0 text-positive" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-text-1">Grupo no WhatsApp</p>
          <p className="text-sm text-text-2">
            Conversas rápidas do dia a dia. As discussões com histórico ficam aqui no fórum.
          </p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 rounded-md border border-line-strong bg-surface px-4 py-2 text-center text-sm font-medium text-text-1 transition-colors hover:bg-surface-sunken"
      >
        Entrar no grupo
      </a>
    </aside>
  );
}
