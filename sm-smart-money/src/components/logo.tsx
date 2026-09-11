import Image from 'next/image';
import monograma from '../../public/marca/sm-monograma.png';
import { cn } from '@/lib/utils';

/**
 * Marca da comunidade: o monograma SM Partner mais o nome.
 *
 * O arquivo entra por import estatico, e nao por caminho em texto, para o build
 * quebrar caso ele saia do lugar. Um caminho em string daria 404 silencioso em
 * producao, e a marca sumiria de oito telas sem ninguem perceber.
 *
 * O PNG tem o proprio fundo verde embutido. Sobre os fundos escuros da marca a
 * diferenca fica em 1,09:1, abaixo do limiar em que uma placa se destaca, entao
 * o monograma parece flutuar; sobre superficie clara ele vira uma placa escura,
 * com contraste de 15:1. Nos dois casos funciona sem moldura.
 */
const TAMANHOS = {
  sm: { caixa: 'size-9', px: 36, titulo: 'text-base', selo: 'text-[10px]' },
  lg: { caixa: 'size-14', px: 56, titulo: 'text-xl', selo: 'text-[11px]' },
} as const;

export function Logo({
  className,
  compact = false,
  size = 'sm',
  priority = false,
}: {
  className?: string;
  compact?: boolean;
  size?: keyof typeof TAMANHOS;
  /** Liga em marca acima da dobra, como a da tela de login, que conta para o LCP. */
  priority?: boolean;
}) {
  const t = TAMANHOS[size];

  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <Image
        src={monograma}
        alt=""
        aria-hidden="true"
        width={t.px}
        height={t.px}
        priority={priority}
        className={cn('shrink-0 rounded-md', t.caixa)}
      />
      {!compact ? (
        <span className="flex flex-col leading-tight">
          <span className={cn('font-display font-semibold text-text-1', t.titulo)}>
            Smart Money
          </span>
          <span
            className={cn(
              'font-medium uppercase tracking-[0.18em] text-text-3',
              t.selo,
            )}
          >
            Comunidade
          </span>
        </span>
      ) : null}
    </span>
  );
}
