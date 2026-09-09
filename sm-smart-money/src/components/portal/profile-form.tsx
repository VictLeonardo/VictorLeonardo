'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Tier } from '@prisma/client';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/input';
import { MemberAvatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { DigitalCard } from '@/components/portal/digital-card';
import { publicBadge } from '@/lib/domain';

type ProfileData = {
  slug: string;
  isPublic: boolean;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  specialties: string[];
  linkedinUrl: string | null;
  websiteUrl: string | null;
  showWhatsapp: boolean;
};

const BIO_LIMIT = 280;
const MAX_SPECIALTIES = 8;

export function ProfileForm({
  host,
  user,
  profile,
}: {
  host: string;
  user: {
    name: string;
    email: string;
    jobTitle: string | null;
    company: string | null;
    phone: string | null;
    tier: Tier;
    isPartner: boolean;
  };
  profile: ProfileData;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = React.useState(user.name);
  const [avatarUrl, setAvatarUrl] = React.useState(profile.avatarUrl ?? '');
  const [bio, setBio] = React.useState(profile.bio ?? '');
  const [specialties, setSpecialties] = React.useState<string[]>(profile.specialties);
  const [specialtyDraft, setSpecialtyDraft] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(profile.isPublic);
  const [showWhatsapp, setShowWhatsapp] = React.useState(profile.showWhatsapp);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function addSpecialty() {
    const value = specialtyDraft.trim();
    if (!value || specialties.includes(value) || specialties.length >= MAX_SPECIALTIES) return;
    setSpecialties((prev) => [...prev, value]);
    setSpecialtyDraft('');
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const res = await fetch('/api/perfil', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        jobTitle: data.get('jobTitle'),
        company: data.get('company'),
        phone: data.get('phone'),
        bio,
        city: data.get('city'),
        state: data.get('state'),
        country: data.get('country'),
        specialties,
        linkedinUrl: data.get('linkedinUrl'),
        websiteUrl: data.get('websiteUrl'),
        avatarUrl,
        isPublic,
        showWhatsapp,
      }),
    });
    const payload = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(payload.error ?? 'Não foi possível salvar o perfil');
      return;
    }

    toast('Perfil atualizado', 'success');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-5 p-5">
            <h2 className="text-sm font-semibold text-text-1">Identificação</h2>

            <div className="flex items-center gap-4">
              <MemberAvatar name={name} src={avatarUrl || null} size={72} />
              <div className="min-w-0 flex-1">
                <Field
                  label="Foto de perfil (URL)"
                  htmlFor="avatarUrl"
                  hint="Cole o link da imagem hospedada. Ela e' exibida em circulo."
                >
                  <Input
                    id="avatarUrl"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    type="url"
                    placeholder="https://..."
                  />
                </Field>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome completo" htmlFor="name" required className="sm:col-span-2">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Cargo" htmlFor="jobTitle">
                <Input id="jobTitle" name="jobTitle" defaultValue={user.jobTitle ?? ''} />
              </Field>
              <Field label="Empresa" htmlFor="company">
                <Input id="company" name="company" defaultValue={user.company ?? ''} />
              </Field>
              <Field label="Cidade" htmlFor="city">
                <Input id="city" name="city" defaultValue={profile.city ?? ''} />
              </Field>
              <Field label="Estado" htmlFor="state">
                <Input id="state" name="state" defaultValue={profile.state ?? ''} maxLength={40} />
              </Field>
              <Field label="País" htmlFor="country">
                <Input id="country" name="country" defaultValue={profile.country ?? 'Brasil'} />
              </Field>
              <Field label="E-mail" htmlFor="email" hint="Para alterar, fale com a equipe SM.">
                <Input id="email" value={user.email} disabled readOnly />
              </Field>
            </div>

            <Field
              label="Bio"
              htmlFor="bio"
              hint={`${bio.length}/${BIO_LIMIT} caracteres`}
            >
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, BIO_LIMIT))}
                rows={3}
                placeholder="Uma linha sobre sua atuação e o que você busca na comunidade."
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-text-1">Áreas de atuação</h2>
            <p className="text-sm text-text-2">
              Ate {MAX_SPECIALTIES} tags. Elas alimentam o filtro do diretorio de membros.
            </p>

            <div className="flex gap-2">
              <Input
                value={specialtyDraft}
                onChange={(e) => setSpecialtyDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSpecialty();
                  }
                }}
                placeholder="Ex.: Planejamento tributário"
                aria-label="Nova área de atuação"
                maxLength={40}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addSpecialty}
                disabled={specialties.length >= MAX_SPECIALTIES}
              >
                Adicionar
              </Button>
            </div>

            {specialties.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {specialties.map((item) => (
                  <li key={item}>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken py-1 pl-3 pr-1.5 text-sm text-text-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => setSpecialties((prev) => prev.filter((s) => s !== item))}
                        aria-label={`Remover ${item}`}
                        className="grid size-5 place-items-center rounded-full text-text-3 transition-colors hover:bg-line hover:text-text-1"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-text-1">Links profissionais</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="LinkedIn" htmlFor="linkedinUrl">
                <Input
                  id="linkedinUrl"
                  name="linkedinUrl"
                  type="url"
                  defaultValue={profile.linkedinUrl ?? ''}
                  placeholder="https://linkedin.com/in/..."
                />
              </Field>
              <Field label="Site pessoal" htmlFor="websiteUrl">
                <Input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  defaultValue={profile.websiteUrl ?? ''}
                  placeholder="https://..."
                />
              </Field>
              <Field
                label="WhatsApp"
                htmlFor="phone"
                hint="Usado pela equipe SM. So aparece no perfil público se você autorizar abaixo."
                className="sm:col-span-2"
              >
                <Input id="phone" name="phone" defaultValue={user.phone ?? ''} placeholder="(11) 90000-0000" />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-24">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-text-1">Perfil público</h2>
              <Badge tone={user.isPartner || user.tier === 'VIP' ? 'brand' : 'neutral'}>
                {publicBadge(user)}
              </Badge>
            </div>

            <p className="break-all rounded-md bg-surface-sunken px-3 py-2 font-mono text-xs text-text-2">
              {host}/{profile.slug}
            </p>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-[var(--color-brand-strong)]"
              />
              <span className="text-sm">
                <span className="block font-medium text-text-1">Perfil público ativo</span>
                <span className="mt-0.5 block text-text-2">
                  Visível para qualquer pessoa com o link. Desativado, o endereço mostra apenas seu
                  nome e o selo da comunidade.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3">
              <input
                type="checkbox"
                checked={showWhatsapp}
                onChange={(e) => setShowWhatsapp(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-[var(--color-brand-strong)]"
              />
              <span className="text-sm">
                <span className="block font-medium text-text-1">Exibir WhatsApp no perfil</span>
                <span className="mt-0.5 block text-text-2">
                  Seu e-mail nunca aparece no perfil público.
                </span>
              </span>
            </label>

            {isPublic ? (
              <div className="flex flex-col gap-2">
                <Button asChild variant="secondary" size="sm">
                  <Link href={`/${profile.slug}`} target="_blank">
                    <ExternalLink className="size-4" aria-hidden="true" />
                    Ver perfil público
                  </Link>
                </Button>
                <DigitalCard slug={profile.slug} name={name} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {error ? (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Salvar alteracoes
        </Button>
      </div>
    </form>
  );
}
