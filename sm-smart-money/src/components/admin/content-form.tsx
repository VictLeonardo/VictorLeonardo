'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { ContentStatus, ContentType, Visibility } from '@prisma/client';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import { RichEditor } from '@/components/admin/rich-editor';
import { useToast } from '@/components/ui/toast';
import { CONTENT_TYPE_LABELS, categoriesFor } from '@/lib/domain';

export type ContentFormValues = {
  id?: string;
  type: ContentType;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverUrl: string;
  category: string;
  status: ContentStatus;
  visibility: Visibility;
  scheduledFor: string;
  authorName: string;
  mediaUrl: string;
  durationSecs: string;
  transcript: string;
  fileUrl: string;
  pageCount: string;
  seriesName: string;
  episodeNumber: string;
};

/**
 * Formulario unico do CMS. Os campos especificos aparecem conforme o tipo — o
 * mesmo componente cobre artigo, video, podcast, analise e e-book.
 */
export function ContentForm({ initial }: { initial: ContentFormValues }) {
  const router = useRouter();
  const { toast } = useToast();

  const [type, setType] = React.useState<ContentType>(initial.type);
  const [body, setBody] = React.useState(initial.body);
  const [status, setStatus] = React.useState<ContentStatus>(initial.status);
  const [categoryChoice, setCategory] = React.useState(initial.category);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const categories = categoriesFor(type);
  // Trocar o tipo muda a lista de categorias. Em vez de corrigir o estado num
  // efeito, a categoria efetiva e' derivada: se a escolhida nao pertence ao novo
  // tipo, cai na primeira valida.
  const category = categories.includes(categoryChoice) ? categoryChoice : categories[0];
  const isEditorial = type === 'ARTIGO' || type === 'ANALISE';
  const isMedia = type === 'VIDEO' || type === 'PODCAST';
  const isFile = type === 'ANALISE' || type === 'EBOOK';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const payload = {
      type,
      title: data.get('title'),
      slug: data.get('slug'),
      excerpt: data.get('excerpt'),
      body,
      coverUrl: data.get('coverUrl'),
      category,
      status,
      visibility: data.get('visibility'),
      scheduledFor: data.get('scheduledFor'),
      authorName: data.get('authorName'),
      mediaUrl: data.get('mediaUrl'),
      durationSecs: data.get('durationSecs') || undefined,
      transcript: data.get('transcript'),
      fileUrl: data.get('fileUrl'),
      pageCount: data.get('pageCount') || undefined,
      seriesName: data.get('seriesName'),
      episodeNumber: data.get('episodeNumber') || undefined,
    };

    const res = await fetch(
      initial.id ? `/api/admin/conteudo/${initial.id}` : '/api/admin/conteudo',
      {
        method: initial.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    const result = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(result.error ?? 'Não foi possível salvar');
      return;
    }

    toast(initial.id ? 'Conteúdo atualizado' : 'Conteúdo criado', 'success');
    router.push('/admin/conteudo');
    router.refresh();
  }

  async function remove() {
    setPending(true);
    const res = await fetch(`/api/admin/conteudo/${initial.id}`, { method: 'DELETE' });
    setPending(false);

    if (!res.ok) {
      toast('Não foi possível excluir', 'error');
      return;
    }
    toast('Conteúdo excluido', 'success');
    router.push('/admin/conteudo');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 lg:grid-cols-[1fr_320px] lg:items-start">
      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-4 p-5">
            <Field label="Título" htmlFor="title" required>
              <Input id="title" name="title" defaultValue={initial.title} required minLength={4} />
            </Field>

            <Field
              label="Resumo"
              htmlFor="excerpt"
              hint="Aparece no card da listagem e na prévia do conteúdo."
            >
              <Textarea id="excerpt" name="excerpt" rows={2} maxLength={400} defaultValue={initial.excerpt} />
            </Field>

            {isEditorial ? (
              <div className="space-y-1.5">
                <span className="text-sm font-medium text-text-1">Conteúdo</span>
                <RichEditor value={body} onChange={setBody} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        {isMedia ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-text-1">Mídia</h2>
              <Field
                label={type === 'VIDEO' ? 'URL do vídeo' : 'URL do áudio'}
                htmlFor="mediaUrl"
                hint={
                  type === 'VIDEO'
                    ? 'Embed do Vimeo/Bunny ou link direto para o arquivo.'
                    : 'Link direto para o arquivo de áudio (mp3).'
                }
              >
                <Input id="mediaUrl" name="mediaUrl" type="url" defaultValue={initial.mediaUrl} />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Duração (segundos)" htmlFor="durationSecs">
                  <Input
                    id="durationSecs"
                    name="durationSecs"
                    type="number"
                    min={0}
                    defaultValue={initial.durationSecs}
                  />
                </Field>
                {type === 'PODCAST' ? (
                  <>
                    <Field label="Serie" htmlFor="seriesName" hint="Agrupa a playlist.">
                      <Input id="seriesName" name="seriesName" defaultValue={initial.seriesName} />
                    </Field>
                    <Field label="Episodio" htmlFor="episodeNumber">
                      <Input
                        id="episodeNumber"
                        name="episodeNumber"
                        type="number"
                        min={0}
                        defaultValue={initial.episodeNumber}
                      />
                    </Field>
                  </>
                ) : null}
              </div>

              <Field label="Transcricao" htmlFor="transcript" hint="Opcional, melhora a acessibilidade.">
                <Textarea id="transcript" name="transcript" rows={5} defaultValue={initial.transcript} />
              </Field>
            </CardContent>
          </Card>
        ) : null}

        {isFile ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold text-text-1">Arquivo</h2>
              <Field
                label="URL do PDF"
                htmlFor="fileUrl"
                hint={
                  type === 'ANALISE'
                    ? 'Se preenchido, o PDF e exibido no lugar do texto.'
                    : 'PDF completo do e-book.'
                }
              >
                <Input id="fileUrl" name="fileUrl" type="url" defaultValue={initial.fileUrl} />
              </Field>
              {type === 'EBOOK' ? (
                <Field label="Número de páginas" htmlFor="pageCount">
                  <Input
                    id="pageCount"
                    name="pageCount"
                    type="number"
                    min={0}
                    defaultValue={initial.pageCount}
                    className="w-40"
                  />
                </Field>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-5 lg:sticky lg:top-24">
        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-text-1">Publicação</h2>

            <Field label="Tipo" htmlFor="type" required>
              <Select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as ContentType)}
                disabled={Boolean(initial.id)}
              >
                {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Categoria" htmlFor="category" required>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Status" htmlFor="status" required>
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
              >
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

            {status === 'PUBLICADO' ? (
              <Field
                label="Agendar publicação"
                htmlFor="scheduledFor"
                hint="Deixe vazio para publicar agora. Com data futura, o conteúdo so aparece na hora marcada."
              >
                <Input
                  id="scheduledFor"
                  name="scheduledFor"
                  type="datetime-local"
                  defaultValue={initial.scheduledFor}
                />
              </Field>
            ) : null}

            <Field label="Autor" htmlFor="authorName">
              <Input id="authorName" name="authorName" defaultValue={initial.authorName} />
            </Field>

            <Field label="Capa (URL)" htmlFor="coverUrl">
              <Input id="coverUrl" name="coverUrl" type="url" defaultValue={initial.coverUrl} />
            </Field>

            <Field
              label="Slug"
              htmlFor="slug"
              hint="Deixe vazio para gerar a partir do título."
            >
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
            {initial.id ? 'Salvar alterações' : 'Criar conteúdo'}
          </Button>

          {initial.id ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-danger"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Excluir conteúdo
            </Button>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Excluir este conteúdo?"
        description="O conteúdo sai do portal imediatamente, junto com o histórico de visualizações. Para tirar do ar mantendo o registro, use o status Arquivado."
        confirmLabel="Excluir"
        loading={pending}
        onConfirm={remove}
      />
    </form>
  );
}
