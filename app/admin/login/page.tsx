import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminLogin } from '@/components/admin/login-form';
import { AdminSetupNotice } from '@/components/admin/setup-notice';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { Skeleton } from '@/components/shared/skeleton';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  if (!isSupabaseConfigured) return <AdminSetupNotice />;

  return (
    <Suspense fallback={<Skeleton className="h-screen w-full" />}>
      <AdminLogin />
    </Suspense>
  );
}
