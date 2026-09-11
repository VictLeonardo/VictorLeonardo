'use client';

import * as React from 'react';
import { Pause, Play, RotateCcw, Volume2 } from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';

/**
 * Player de video. Aceita tanto um embed (Vimeo/Bunny) quanto um arquivo direto:
 * a hospedagem pode mudar por conteudo sem trocar o componente.
 */
export function VideoPlayer({
  url,
  title,
  poster,
  className,
}: {
  url: string;
  title: string;
  poster?: string | null;
  className?: string;
}) {
  const isEmbed = /vimeo\.com|youtube\.com|youtu\.be|b-cdn\.net\/embed|iframe\.mediadelivery\.net/.test(url);

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-black', className)}>
      <div className="aspect-video w-full">
        {isEmbed ? (
          <iframe
            src={url}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="size-full"
          />
        ) : (
          <video src={url} poster={poster ?? undefined} controls preload="metadata" className="size-full">
            <track kind="captions" />
          </video>
        )}
      </div>
    </div>
  );
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Player de audio para os podcasts, com controle de velocidade de 0,75x a 2x.
 * O <audio> nativo do navegador nao expoe esse controle na maioria dos temas.
 */
export function AudioPlayer({
  url,
  title,
  className,
  onComplete,
}: {
  url: string;
  title: string;
  className?: string;
  onComplete?: () => void;
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const [current, setCurrent] = React.useState(0);
  const [duration, setDuration] = React.useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const changeSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    audio.playbackRate = next;
    setSpeed(next);
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  return (
    <div className={cn('rounded-lg border border-line bg-surface p-4', className)}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setPlaying(false);
          onComplete?.();
        }}
      >
        <track kind="captions" />
      </audio>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pausar ${title}` : `Reproduzir ${title}`}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-[var(--color-brand-contrast)] transition hover:bg-brand-hover"
        >
          {playing ? (
            <Pause className="size-5" aria-hidden="true" />
          ) : (
            <Play className="ml-0.5 size-5" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => seek(Math.max(0, current - 15))}
          aria-label="Voltar 15 segundos"
          className="grid size-9 shrink-0 place-items-center rounded-md text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={current}
            step={1}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Posição do áudio"
            className="w-full accent-[var(--color-brand-strong)]"
          />
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-text-3">
            <span>{formatDuration(Math.floor(current))}</span>
            <span>{formatDuration(Math.floor(duration))}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={changeSpeed}
          aria-label={`Velocidade de reprodução: ${speed}x. Clique para alterar.`}
          className="shrink-0 rounded-md border border-line-strong px-2.5 py-1.5 text-xs font-semibold tabular-nums text-text-2 transition-colors hover:bg-surface-sunken hover:text-text-1"
        >
          {speed}x
        </button>

        <Volume2 className="hidden size-4 shrink-0 text-text-3 sm:block" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Visualizador de PDF inline — nunca forca download. */
export function PdfViewer({
  url,
  title,
  className,
  height = 'h-[70vh]',
}: {
  url: string;
  title: string;
  className?: string;
  height?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface-sunken', className)}>
      <object data={`${url}#view=FitH`} type="application/pdf" className={cn('w-full', height)}>
        <div className="p-8 text-center">
          <p className="text-sm text-text-2">
            Seu navegador não consegue exibir PDF embutido.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-brand-strong hover:underline"
          >
            Abrir {title} em nova aba
          </a>
        </div>
      </object>
    </div>
  );
}
