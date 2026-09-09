import type { Metadata } from 'next';
import { requireActiveMember } from '@/lib/auth/guards';
import { prisma } from '@/lib/prisma';
import { ensureProfile } from '@/server/profile';
import { SectionHeader } from '@/components/ui/section-header';
import { ProfileForm } from '@/components/portal/profile-form';
import { env } from '@/lib/env';
import { appHost } from '@/lib/utils';

export const metadata: Metadata = { title: 'Meu Perfil' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await requireActiveMember('/perfil');
  await ensureProfile(session.id, session.name);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      name: true,
      email: true,
      jobTitle: true,
      company: true,
      phone: true,
      tier: true,
      isPartner: true,
      profile: true,
    },
  });

  return (
    <div className="space-y-7">
      <SectionHeader
        eyebrow="Conta"
        title="Meu Perfil"
        description="Estes dados alimentam o diretório da comunidade e o seu perfil público."
      />
      {/* O host vem do servidor: em client component, NEXT_PUBLIC_ seria
          congelado no build e a mesma imagem deixaria de servir varios ambientes. */}
      <ProfileForm
        host={appHost(env.NEXT_PUBLIC_APP_URL)}
        user={{
          name: user.name,
          email: user.email,
          jobTitle: user.jobTitle,
          company: user.company,
          phone: user.phone,
          tier: user.tier,
          isPartner: user.isPartner,
        }}
        profile={{
          slug: user.profile!.slug,
          isPublic: user.profile!.isPublic,
          avatarUrl: user.profile!.avatarUrl,
          bio: user.profile!.bio,
          city: user.profile!.city,
          state: user.profile!.state,
          country: user.profile!.country,
          specialties: user.profile!.specialties,
          linkedinUrl: user.profile!.linkedinUrl,
          websiteUrl: user.profile!.websiteUrl,
          showWhatsapp: user.profile!.showWhatsapp,
        }}
      />
    </div>
  );
}
