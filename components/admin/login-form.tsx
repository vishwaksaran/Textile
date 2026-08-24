'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, LockKeyhole, Loader2 } from 'lucide-react';
import { LogoMark } from '@/components/store/logo';
import { createClient } from '@/lib/supabase/client';
import { STORE } from '@/lib/config';
import { isValidEmail } from '@/lib/utils';

export function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  // Only ever redirect inside this app, never to an attacker-supplied host.
  const rawNext = params.get('next') ?? '/admin';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/admin';

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [reveal, setReveal] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');

    setBusy(true);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        // Deliberately vague: never reveal which half was wrong.
        setError(
          signInError.message === 'Invalid login credentials'
            ? 'Those credentials do not match an admin account.'
            : signInError.message,
        );
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-surface px-margin-mobile">
      <div className="mb-8 text-center">
        <LogoMark className="mx-auto mb-4 h-14 text-primary" />
        <h1 className="mb-2 font-headline-lg text-headline-lg italic text-primary">
          {STORE.name}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Admin authentication required
        </p>
      </div>

      <div className="glass-panel ambient-shadow w-full max-w-md border border-outline-variant p-8">
        <form className="space-y-6" onSubmit={submit} noValidate>
          <div>
            <label
              htmlFor="admin-email"
              className="mb-2 block font-label-lg text-label-lg text-on-surface"
            >
              Username
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourstore.in"
              autoFocus
              aria-invalid={Boolean(error)}
              className="w-full border-0 border-b border-earthy-bronze bg-transparent px-0 py-2 text-on-surface transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container focus:outline-none focus:ring-0"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="mb-2 block font-label-lg text-label-lg text-on-surface"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={reveal ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter vault key"
                aria-invalid={Boolean(error)}
                className="w-full border-0 border-b border-earthy-bronze bg-transparent px-0 py-2 pr-10 text-on-surface transition-colors placeholder:text-on-surface-variant/50 focus:border-primary-container focus:outline-none focus:ring-0"
              />
              <button
                type="button"
                onClick={() => setReveal((r) => !r)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-on-surface-variant hover:text-primary"
              >
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="animate-shake border-l-2 border-error bg-error-container/40 px-3 py-2 font-body-md text-sm text-on-error-container motion-reduce:animate-none"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 bg-deep-maroon py-3 font-label-lg text-label-lg uppercase tracking-wider text-primary-fixed shadow-sm transition-colors hover:bg-secondary disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening…
              </>
            ) : (
              <>
                <LockKeyhole className="h-4 w-4" />
                Enter Vault
              </>
            )}
          </button>

          <p className="text-center font-body-md text-xs text-on-surface-variant">
            Accounts are created with{' '}
            <code className="rounded bg-surface-variant px-1">npm run admin:create</code>. Staff
            only — this page is not linked from the storefront.
          </p>
        </form>
      </div>

      <div className="zari-divider absolute bottom-8 left-0 right-0 mx-auto w-1/2" />
    </div>
  );
}
