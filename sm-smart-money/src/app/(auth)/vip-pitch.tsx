'use client';

import { usePathname } from 'next/navigation';
import { AssinarButton } from '@/components/assinar-button';

/**
 * A proposta do VIP Lounge, no painel de marca das telas de acesso.
 *
 * E' cliente por um motivo so': o convite para assinar sai de cena quando o
 * visitante ja' esta no caminho da assinatura, e quem sabe disso e' a rota.
 */

const BENEFICIOS = [
  'Membro Estratégico SM Partner',
  'Cartão virtual online direto da página SM Partner, exportável em PDF ou imagem',
  'Página exclusiva de Strategic Member',
  'Conteúdos exclusivos sobre governança, IA, mercado e investimentos',
  'Relatórios, estudos e análises estratégicas',
  'Networking qualificado com líderes, investidores e tomadores de decisão',
  'Grupo exclusivo de WhatsApp com notícias selecionadas e análises comentadas por Júlio Damião',
];

export function VipPitch({ mostrarCta }: { mostrarCta: boolean }) {
  const pathname = usePathname();
  // Na propria tela de assinatura o convite seria redundante.
  const cta = mostrarCta && pathname !== '/assinar';

  return (
    <div className="flex max-w-xl flex-col gap-7">
      <span className="inline-flex w-fit items-center gap-2 rounded-full border border-brand/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
        Acesso VIP
      </span>

      <blockquote className="flex flex-col gap-3">
        <p className="font-display text-3xl leading-tight text-brand-ink xl:text-[2.1rem]">
          &ldquo;Entender o mundo não é ter mais informações, é fazer as perguntas certas.&rdquo;
        </p>
        <footer className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand">
          Follow the Money. Júlio Damião.
        </footer>
      </blockquote>

      <p className="text-sm leading-relaxed text-brand-ink-muted">
        Por isso criamos o VIP Lounge SM Partner: um ecossistema exclusivo para empresários,
        investidores, conselheiros e executivos que buscam decisões mais inteligentes e geração
        consistente de valor.
      </p>

      <div className="flex flex-col gap-3.5">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-ink-muted">
          Ao participar, você terá acesso a
        </h2>
        <ul className="flex flex-col gap-2.5">
          {BENEFICIOS.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-snug text-brand-ink-muted">
              <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rotate-45 bg-brand" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-brand-hairline pt-6">
        <p className="text-xs leading-relaxed text-brand-ink-muted">
          O grupo aberto permanece como espaço de conexão da comunidade. O VIP Lounge é o ambiente
          destinado aos membros que desejam aprofundar relacionamentos e conhecimento, e se
          posicionar num ecossistema de alto nível e oportunidades.
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink-muted">
          Vagas limitadas.
        </p>
      </div>

      {cta ? <AssinarButton /> : null}
    </div>
  );
}
