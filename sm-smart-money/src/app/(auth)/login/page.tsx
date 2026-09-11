import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { stripeConfigured } from '@/lib/env';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Entrar' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(user.role === 'ADMIN' ? '/admin' : '/dashboard');

  const { next } = await searchParams;
  return <LoginForm next={next} podeAssinar={stripeConfigured} />;
}
