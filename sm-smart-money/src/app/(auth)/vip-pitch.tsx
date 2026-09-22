'use client';

import { usePathname } from 'next/navigation';
import { AssinarButton } from '@/components/assinar-button';

/**
 * A proposta do VIP Lounge, no painel de marca das telas de acesso.
 *
 * Vem partida em duas porque no celular ela nao fica inteira num lugar so': a
 * abertura abre a pagina, o formulario de login entra no meio, e os beneficios
 * fecham embaixo. No desktop as duas metades voltam a ser uma coisa so', na
 * coluna lateral -- por isso `VipPitch` existe, para o lado que nao parte.
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

/** O que o VIP Lounge e', e como entrar. */
export function VipAbertura({ mostrarCta, preco }: { mostrarCta: boolean; preco: string | null }) {
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
        <p className="font-display text-2xl leading-tight text-brand-ink sm:text-3xl xl:text-[2.1rem]">
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

      {/* O convite fecha a abertura: vem depois da frase e do paragrafo que
          dizem o que se esta' assinando, e antes de qualquer outra coisa. No
          celular a abertura abre a pagina, entao ele cabe na primeira tela sem
          precisar disputar espaco com o resto do painel. */}
      {cta ? (
        <AssinarButton
          variant="solido"
          eyebrow="Ainda não é membro?"
          preco={preco}
          texto=""
          chamada="Clique aqui e assine agora"
        />
      ) : null}
    </div>
  );
}

/** O que se leva ao entrar, e para quem o ambiente e'. */
export function VipBeneficios() {
  return (
    <div className="flex max-w-xl flex-col gap-7">
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
    </div>
  );
}

/** As duas metades juntas, para a coluna lateral do desktop. */
export function VipPitch({ mostrarCta, preco }: { mostrarCta: boolean; preco: string | null }) {
  return (
    <div className="flex flex-col gap-7">
      <VipAbertura mostrarCta={mostrarCta} preco={preco} />
      <VipBeneficios />
    </div>
  );
}
