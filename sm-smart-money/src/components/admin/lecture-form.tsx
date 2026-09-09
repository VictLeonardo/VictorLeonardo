'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ContentStatus, Visibility } from '@prisma/client';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export type LectureFormValues = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  coverUrl: string;
  theme: string;
  startsAt: string;
  durationMin: string;
  liveUrl: string;
  recordingUrl: string;
  status: ContentStatus;
  visibility: Visibility;
  speakerName: string;
  speakerJobTitle: string;
  speakerBio: string;
  speakerAvatarUrl: string;
};

export function LectureForm({ initial }: { initial: LectureFormValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const res = await fetch(
      initial.id ? `/api/admin/palestras/${initial.id}` : '/api/admin/palestras',
      {
        method: initial.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      },
    );
    const payload = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(payload.error ?? 'Não foi possível salvar');
      return;
    }

    toast(initial.id ? 'Palestra atualizada' : 'Palestra criada', 'success');
    router.push('/admin/palestras');
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const res = await fetch(`/api/admin/palestras/${initial.id}`, { method: 'DELETE' });
    setPending(false);
    if (!res.ok) {
      toast('Não foi possível excluir', 'error');
      return;
    }
    toast('Palestra excluida', 'success');
    router.push('/admin/palestras');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-text-1">Sessão</h2>
            <Field label="Título" htmlFor="title" required>
              <Input id="title" name="title" defaultValue={initial.title} required minLength={4} />
            </Field>
            <Field label="Descrição" htmlFor="description">
              <Textarea id="description" name="description" rows={4} defaultValue={initial.description} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Data e hora" htmlFor="startsAt" required>
                <Input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={initial.startsAt}
                  required
                />
              </Field>
              <Field label="Duração (minutos)" htmlFor="durationMin" required>
                <Input
                  id="durationMin"
                  name="durationMin"
                  type="number"
                  min={5}
                  max={600}
                  defaultValue={initial.durationMin || '60'}
                  required
                />
              </Field>
              <Field
                label="Link da transmissão"
                htmlFor="liveUrl"
                hint="Zoom, Meet ou similar. Exibido antes do evento."
              >
                <Input id="liveUrl" name="liveUrl" type="url" defaultValue={initial.liveUrl} />
              </Field>
              <Field
                label="Gravação"
                htmlFor="recordingUrl"
                hint="Embed ou arquivo. Aparece depois do horário da sessão."
              >
                <Input
                  id="recordingUrl"
                  name="recordingUrl"
                  type="url"
                  defaultValue={initial.recordingUrl}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-text-1">Speaker</h2>
            <p className="text-sm text-text-2">
              Um palestrante com o mesmo nome é reaproveitado e tem a ficha atualizada.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nome" htmlFor="speakerName">
                <Input id="speakerName" name="speakerName" defaultValue={initial.speakerName} />
              </Field>
              <Field label="Cargo" htmlFor="speakerJobTitle">
                <Input
                  id="speakerJobTitle"
                  name="speakerJobTitle"
                  defaultValue={initial.speakerJobTitle}
                />
              </Field>
              <Field label="Foto (URL)" htmlFor="speakerAvatarUrl" className="sm:col-span-2">
                <Input
                  id="speakerAvatarUrl"
                  name="speakerAvatarUrl"
                  type="url"
                  defaultValue={initial.speakerAvatarUrl}
                />
              </Field>
              <Field label="Bio curta" htmlFor="speakerBio" className="sm:col-span-2">
                <Textarea id="speakerBio" name="speakerBio" rows={3} defaultValue={initial.speakerBio} />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-text-1">Publicação</h2>
            <Field label="Tema" htmlFor="theme" required>
              <Input id="theme" name="theme" defaultValue={initial.theme} required placeholder="Ex.: Tributário" />
            </Field>
            <Field label="Status" htmlFor="status" required>
              <Select id="status" name="status" defaultValue={initial.status}>
                <option value="RASCUNHO">Rascunho</option>
                <option value="PUBLICADO">Publicado</option>
                <option value="ARQUIVADO">Arquivado</option>
              </Select>
            </Field>
            <Field label="Visibilidade" htmlFor="visibility" required>
              <Select id="visibility" name="visibility" defaultValue={initial.visibility}>
                <option value="TODOS">Todos os membros</option>
                <option value="VIP">Apenas VIP</option>
              </Select>
            </Field>
            <Field label="Capa (URL)" htmlFor="coverUrl">
              <Input id="coverUrl" name="coverUrl" type="url" defaultValue={initial.coverUrl} />
            </Field>
            <Field label="Slug" htmlFor="slug" hint="Deixe vazio para gerar do título.">
              <Input id="slug" name="slug" defaultValue={initial.slug} />
            </Field>
          </CardContent>
        </Card>

        {error ? (
          <p role="alert" className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="space-y-2">
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {initial.id ? 'Salvar alterações' : 'Criar palestra'}
          </Button>
          {initial.id ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-danger"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Excluir palestra
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir esta palestra?"
        description="A sessão sai da agenda e a gravação deixa de ficar acessível aos membros. A ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={remove}
      />
    </form>
  );
}
