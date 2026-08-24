import Link from 'next/link';
import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Shown when the admin area is opened before Supabase has been configured. */
export function AdminSetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low px-margin-mobile">
      <div className="w-full max-w-lg rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-8">
        <Database className="mb-5 h-8 w-8 text-earthy-bronze" strokeWidth={1.5} />
        <h1 className="mb-3 font-headline-lg text-headline-lg text-deep-maroon">
          Admin needs Supabase
        </h1>
        <p className="mb-6 font-body-md text-body-md text-on-surface-variant">
          The storefront runs on bundled demo data, but the admin panel reads and writes real
          records. Add your Supabase credentials to <code>.env.local</code> and restart the dev
          server.
        </p>

        <ol className="mb-8 space-y-3 font-body-md text-sm text-on-surface-variant">
          <li>
            <strong className="text-on-surface">1.</strong> Create a project at supabase.com and run{' '}
            <code>supabase/migrations/0001_init.sql</code> then <code>0002_seed.sql</code>.
          </li>
          <li>
            <strong className="text-on-surface">2.</strong> Set{' '}
            <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{' '}
            <code>SUPABASE_SERVICE_ROLE_KEY</code>.
          </li>
          <li>
            <strong className="text-on-surface">3.</strong> Create an auth user, then insert a row
            in <code>admins</code> with that user&rsquo;s id and email.
          </li>
        </ol>

        <Button asChild variant="outline">
          <Link href="/">Back to the store</Link>
        </Button>
      </div>
    </div>
  );
}
