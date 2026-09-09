import { avatarHue, cn, initials } from '@/lib/utils';

/**
 * Avatar do membro. Sem foto, cai numa inicial colorida — a matiz e' derivada do
 * nome, entao o mesmo membro sempre aparece com a mesma cor em toda a plataforma.
 */
export function MemberAvatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const dimension = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URLs de storage variam por ambiente
      <img
        src={src}
        alt=""
        style={dimension}
        className={cn('shrink-0 rounded-full border border-line object-cover', className)}
      />
    );
  }

  const hue = avatarHue(name);
  return (
    <span
      aria-hidden="true"
      style={{
        ...dimension,
        backgroundColor: `hsl(${hue} 34% 88%)`,
        color: `hsl(${hue} 46% 26%)`,
        fontSize: Math.max(11, size * 0.36),
      }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border border-line font-semibold',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
