'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'sm-theme';
/** Evento proprio: `storage` so dispara em outras abas, nao na que escreveu. */
const THEME_EVENT = 'sm-theme-change';

function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}

/**
 * Alterna claro / escuro / sistema. A escolha vive no localStorage e e' aplicada
 * antes da hidratacao pelo script inline em layout.tsx, evitando flash de tema.
 */
/**
 * Assina o localStorage em vez de ler dentro de um efeito: `useSyncExternalStore`
 * entrega o valor certo ja' na primeira renderizacao do cliente e mantem a aba
 * sincronizada quando o tema muda em outra janela.
 */
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(THEME_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(THEME_EVENT, onChange);
  };
}

function getSnapshot(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/** No servidor nao ha' preferencia salva; o script inline corrige antes do paint. */
function getServerSnapshot(): Theme {
  return 'system';
}

export function ThemeToggle({ className }: { className?: string }) {
  const theme = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  React.useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const select = (next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Tema claro', icon: Sun },
    { value: 'dark', label: 'Tema escuro', icon: Moon },
    { value: 'system', label: 'Tema do sistema', icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={cn('inline-flex items-center gap-0.5 rounded-md border border-line p-0.5', className)}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => select(value)}
          className={cn(
            'rounded-sm p-1.5 transition-colors',
            theme === value
              ? 'bg-brand-soft text-brand-strong'
              : 'text-text-3 hover:bg-surface-sunken hover:text-text-1',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

/** Script injetado no <head> para aplicar o tema antes do primeiro paint. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
