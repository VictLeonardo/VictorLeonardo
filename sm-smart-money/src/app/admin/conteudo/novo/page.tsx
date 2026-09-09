import type { Metadata } from 'next';
import Link from 'next/link';
import type { ContentType } from '@prisma/client';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { SectionHeader } from '@/components/ui/section-header';
import { ContentForm } from '@/components/admin/content-form';
import { categoriesFor } from '@/lib/domain';

export const metadata: Metadata = { title: 'Novo conteúdo' };
export const dynamic = 'force-dynamic';

const TYPES: ContentType[] = ['ARTIGO', 'VIDEO', 'PODCAST', 'ANALISE', 'EBOOK'];

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const admin = await requireAdmin('/admin/conteudo/novo');
  const params = await searchParams;
  const type = TYPES.includes(params.tipo as ContentType) ? (params.tipo as ContentType) : 'ARTIGO';

  return (
    <div className="space-y-6">
      <Link
        href="/admin/conteudo"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Conteúdo
      </Link>

      <SectionHeader eyebrow="CMS" title="Novo conteúdo" />

      <ContentForm
        initial={{
          type,
          title: '',
          slug: '',
          excerpt: '',
          body: '',
          coverUrl: '',
          category: categoriesFor(type)[0],
          status: 'RASCUNHO',
          visibility: 'TODOS',
          scheduledFor: '',
          authorName: admin.name,
          mediaUrl: '',
          durationSecs: '',
          transcript: '',
          fileUrl: '',
          pageCount: '',
          seriesName: '',
          episodeNumber: '',
        }}
      />
    </div>
  );
}
