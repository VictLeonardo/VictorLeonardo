import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Briefcase, Globe, MapPin, MessageCircle } from 'lucide-react';
import { getProfileBySlug } from '@/server/profile';
import { MemberAvatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { PublicShare } from '@/components/public-share';
import { publicBadge } from '@/lib/domain';
import { normalizePhone } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);
  if (!profile) return { title: 'Perfil não encontrado' };

  const title = `${profile.user.name} · SM Smart Money`;

  // Perfil inativo nao vaza cargo nem empresa para redes sociais.
  if (!profile.isPublic) {
    return {
      title,
      description: 'Membro da comunidade SM Smart Money.',
      robots: { index: false, follow: false },
      openGraph: { title, description: 'Membro da comunidade SM Smart Money.', type: 'profile' },
    };
  }

  const description = [profile.user.jobTitle, profile.user.company].filter(Boolean).join(' · ');

  return {
    title,
    description: description || 'Membro estratégico da comunidade SM Smart Money.',
    openGraph: {
      title,
      description: description || 'Membro estratégico da comunidade SM Smart Money.',
      type: 'profile',
      ...(profile.avatarUrl ? { images: [{ url: profile.avatarUrl }] } : {}),
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getProfileBySlug(slug);

  // Slug inexistente e' 404 de verdade. Perfil existente porem inativo cai na
  // pagina "em breve" logo abaixo: a URL continua valida e o link compartilhado
  // nao quebra (G07).
  if (!profile) notFound();

  const { user } = profile;
  const location = [profile.city, profile.state].filter(Boolean).join(', ');

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm text-text-2 transition-colors hover:text-text-1">
              ← Comunidade
            </Link>
          </div>
        </div>
      </header>

      <main id="conteudo-principal" className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        {!profile.isPublic ? (
          <section className="rounded-lg border border-line bg-surface p-8 text-center shadow-card">
            <MemberAvatar name={user.name} size={80} className="mx-auto" />
            <h1 className="mt-5 font-display text-3xl text-text-1">{user.name}</h1>
            <Badge tone="neutral" className="mt-3">
              Membro SM Smart Money
            </Badge>
            <p className="mx-auto mt-5 max-w-sm text-sm leading-relaxed text-text-2">
              Este perfil ainda nao foi publicado. Assim que {user.name.split(' ')[0]} ativar o perfil
              publico, ele aparece neste mesmo endereco.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-sm text-brand-strong hover:underline"
            >
              Conhecer a comunidade
            </Link>
          </section>
        ) : (
          <article className="space-y-6">
            <header className="rounded-lg border border-line bg-surface p-6 shadow-card sm:p-8">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <MemberAvatar name={user.name} src={profile.avatarUrl} size={96} />
                <div className="min-w-0 space-y-2">
                  <Badge tone={user.isPartner || user.tier === 'VIP' ? 'brand' : 'neutral'}>
                    {publicBadge(user)}
                  </Badge>
                  <h1 className="font-display text-3xl leading-tight text-text-1 sm:text-4xl">
                    {user.name}
                  </h1>
                  {user.jobTitle ? <p className="text-text-2">{user.jobTitle}</p> : null}
                  {user.company ? <p className="text-sm text-text-3">{user.company}</p> : null}
                  {location ? (
                    <p className="inline-flex items-center gap-1.5 text-sm text-text-3">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {location}
                      {profile.country ? ` · ${profile.country}` : ''}
                    </p>
                  ) : null}
                </div>
              </div>

              {profile.bio ? (
                <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-text-1">
                  {profile.bio}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {profile.linkedinUrl ? (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="inline-flex items-center gap-2 rounded-md border border-line-strong px-3 py-2 text-sm text-text-1 transition-colors hover:bg-surface-sunken"
                  >
                    <Briefcase className="size-4" aria-hidden="true" />
                    LinkedIn
                  </a>
                ) : null}
                {profile.websiteUrl ? (
                  <a
                    href={profile.websiteUrl}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="inline-flex items-center gap-2 rounded-md border border-line-strong px-3 py-2 text-sm text-text-1 transition-colors hover:bg-surface-sunken"
                  >
                    <Globe className="size-4" aria-hidden="true" />
                    Site
                  </a>
                ) : null}
                {profile.showWhatsapp && user.phone ? (
                  <a
                    href={`https://wa.me/${normalizePhone(user.phone)}`}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="inline-flex items-center gap-2 rounded-md border border-line-strong px-3 py-2 text-sm text-text-1 transition-colors hover:bg-surface-sunken"
                  >
                    <MessageCircle className="size-4" aria-hidden="true" />
                    WhatsApp
                  </a>
                ) : null}
                <PublicShare name={user.name} slug={profile.slug} />
              </div>
            </header>

            {profile.specialties.length > 0 ? (
              <section
                aria-labelledby="atuacao"
                className="rounded-lg border border-line bg-surface p-6 shadow-card"
              >
                <h2
                  id="atuacao"
                  className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-strong"
                >
                  Áreas de atuação
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {profile.specialties.map((item) => (
                    <li
                      key={item}
                      className="rounded-full bg-surface-sunken px-3 py-1 text-sm text-text-1"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-3xl px-5 py-6">
          <p className="text-xs text-text-3">
            SM Smart Money · Comunidade de inteligência financeira.
          </p>
        </div>
      </footer>
    </div>
  );
}
