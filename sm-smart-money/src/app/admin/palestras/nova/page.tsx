import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { SectionHeader } from '@/components/ui/section-header';
import { LectureForm } from '@/components/admin/lecture-form';

export const metadata: Metadata = { title: 'Nova palestra' };
export const dynamic = 'force-dynamic';

export default async function NewLecturePage() {
  await requireAdmin('/admin/palestras/nova');

  return (
    <div className="space-y-6">
      <Link
        href="/admin/palestras"
        className="inline-flex items-center gap-1.5 text-sm text-text-2 transition-colors hover:text-text-1"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Palestras
      </Link>

      <SectionHeader eyebrow="Agenda" title="Nova palestra" />

      <LectureForm
        initial={{
          title: '',
          slug: '',
          description: '',
          coverUrl: '',
          theme: '',
          startsAt: '',
          durationMin: '60',
          liveUrl: '',
          recordingUrl: '',
          status: 'RASCUNHO',
          visibility: 'TODOS',
          speakerName: '',
          speakerJobTitle: '',
          speakerBio: '',
          speakerAvatarUrl: '',
        }}
      />
    </div>
  );
}
