'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('[app] unhandled error', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-margin-mobile text-center">
      <p className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
        Something snagged
      </p>
      <h1 className="max-w-lg font-display-lg text-[32px] leading-tight text-deep-maroon md:text-[40px]">
        We could not load that page
      </h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
        This is on us, not you. Try again — and if it keeps happening, tell us what you were doing
        and we will fix it.
      </p>
      {error.digest && (
        <p className="font-body-md text-xs text-on-surface-variant/70">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} size="lg" shine>
          Try again
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to the store</Link>
        </Button>
      </div>
    </div>
  );
}
