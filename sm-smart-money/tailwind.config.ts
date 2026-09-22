import type { Config } from 'tailwindcss';

/**
 * O tema nao declara cores literais: tudo aponta para os tokens CSS definidos
 * em src/app/globals.css. Assim light e dark mode compartilham o mesmo utilitario
 * (`bg-surface`, `text-text-1`, ...) e trocam apenas o valor do token.
 */

/**
 * Um token de cor que aceita transparencia.
 *
 * Um `var(--x)` cru nao aceita: o Tailwind precisa saber os canais da cor para
 * calcular o alfa, e com uma variavel ele nao sabe -- entao simplesmente nao
 * gera a classe. `bg-danger/10` e os outros 48 usos de `/NN` no projeto nao
 * existiam no CSS, e o elemento ficava sem fundo nenhum em vez de com o fundo
 * suave que o desenho pedia.
 *
 * O `color-mix` resolve porque mistura no navegador, onde a variavel ja' tem
 * valor. So' que ele entra apenas quando alguem pede alfa: sem modificador, o
 * Tailwind manda a variavel legada de opacidade do utilitario e aqui devolvemos
 * o `var()` limpo de sempre. Assim o color-mix fica restrito a quem precisa
 * dele, e nao vira dependencia de todas as cores da plataforma.
 */
function cor(token: string) {
  const resolver = ({ opacityValue }: { opacityValue?: string | number }) => {
    const alfa = opacityValue === undefined ? '' : String(opacityValue);
    if (!alfa || alfa === '1' || alfa.startsWith('var(--tw-')) return `var(${token})`;
    return `color-mix(in srgb, var(${token}) calc(${alfa} * 100%), transparent)`;
  };
  // O Tailwind aceita funcao como valor de cor -- e' assim que os helpers dele
  // proprio funcionam (`rgb`/`hsl` em types/config.d.ts). O tipo do config so'
  // nao diz isso para cores aninhadas, entao o cast fica aqui, uma vez, em vez
  // de em cada um dos vinte tokens abaixo.
  return resolver as unknown as string;
}

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: cor('--color-brand'),
          strong: cor('--color-brand-strong'),
          hover: cor('--color-brand-hover'),
          soft: cor('--color-brand-soft'),
          contrast: cor('--color-brand-contrast'),
          // Tinta de quem escreve sobre o painel de marca, em qualquer tema.
          panel: cor('--color-brand-panel'),
          ink: cor('--color-brand-ink'),
          'ink-muted': cor('--color-brand-ink-muted'),
          hairline: cor('--color-brand-hairline'),
        },
        canvas: cor('--color-canvas'),
        surface: {
          DEFAULT: cor('--color-surface'),
          raised: cor('--color-surface-raised'),
          sunken: cor('--color-surface-sunken'),
        },
        line: {
          DEFAULT: cor('--color-line'),
          strong: cor('--color-line-strong'),
        },
        text: {
          1: cor('--color-text-1'),
          2: cor('--color-text-2'),
          3: cor('--color-text-3'),
        },
        positive: cor('--color-positive'),
        warning: cor('--color-warning'),
        danger: cor('--color-danger'),
        'danger-ink': cor('--color-danger-ink'),
        info: cor('--color-info'),
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        pop: 'var(--shadow-pop)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
