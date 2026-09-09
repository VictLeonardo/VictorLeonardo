import { getSessionUser } from '@/lib/auth/session';
import { buildIcs, getLectureBySlug } from '@/server/lectures';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return new Response('Não autenticado', { status: 401 });

  const { slug } = await params;
  const lecture = await getLectureBySlug(slug, user);
  if (!lecture) return new Response('Palestra não encontrada', { status: 404 });

  return new Response(buildIcs(lecture), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${lecture.slug}.ics"`,
    },
  });
}
