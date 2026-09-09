import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth/session';
import { ensureProfile } from '@/server/profile';

const schema = z.object({
  name: z.string().trim().min(3).max(120),
  jobTitle: z.string().trim().max(120).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  bio: z.string().trim().max(280).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  state: z.string().trim().max(40).optional().or(z.literal('')),
  country: z.string().trim().max(60).optional().or(z.literal('')),
  specialties: z.array(z.string().trim().min(2).max(40)).max(8).default([]),
  linkedinUrl: z.string().trim().url('Informe uma URL valida').optional().or(z.literal('')),
  websiteUrl: z.string().trim().url('Informe uma URL valida').optional().or(z.literal('')),
  avatarUrl: z.string().trim().url().optional().or(z.literal('')),
  isPublic: z.boolean(),
  showWhatsapp: z.boolean(),
});

const orNull = (value: string | undefined) => (value && value.length > 0 ? value : null);

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const data = parsed.data;
  const profile = await ensureProfile(user.id, data.name);

  // O slug nasce do nome no cadastro e nao muda depois: links ja' compartilhados
  // continuam validos mesmo que o membro corrija o proprio nome.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        jobTitle: orNull(data.jobTitle),
        company: orNull(data.company),
        phone: orNull(data.phone),
      },
    }),
    prisma.profile.update({
      where: { id: profile.id },
      data: {
        bio: orNull(data.bio),
        city: orNull(data.city),
        state: orNull(data.state),
        country: orNull(data.country),
        specialties: data.specialties,
        linkedinUrl: orNull(data.linkedinUrl),
        websiteUrl: orNull(data.websiteUrl),
        avatarUrl: orNull(data.avatarUrl),
        isPublic: data.isPublic,
        showWhatsapp: data.showWhatsapp,
        activatedAt: data.isPublic ? (profile.activatedAt ?? new Date()) : profile.activatedAt,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, slug: profile.slug });
}
