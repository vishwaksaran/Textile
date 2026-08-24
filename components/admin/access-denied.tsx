import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * The visitor is signed in to Supabase but is not listed in `admins`, or is
 * not signed in at all and reached this without the middleware redirect.
 */
export function AdminAccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low px-margin-mobile">
      <div className="w-full max-w-md rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-8 text-center">
        <ShieldAlert className="mx-auto mb-5 h-8 w-8 text-error" strokeWidth={1.5} />
        <h1 className="mb-3 font-headline-lg text-headline-lg text-deep-maroon">
          Admin access required
        </h1>
        <p className="mb-6 font-body-md text-body-md text-on-surface-variant">
          This account is not on the admin list. Sign in with an authorised account, or ask an
          existing admin to add your email to the <code>admins</code> table.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/admin/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to the store</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
