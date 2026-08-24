import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogoMark } from '@/components/store/logo';
import { STORE } from '@/lib/config';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-margin-mobile text-center">
      <LogoMark className="h-14 text-deep-maroon" />
      <p className="font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
        404 — nothing on this loom
      </p>
      <h1 className="max-w-lg font-display-lg text-[34px] leading-tight text-deep-maroon md:text-[44px]">
        This page has come off the thread
      </h1>
      <p className="max-w-md font-body-md text-body-md text-on-surface-variant">
        The piece may have sold out, or the link may be old. Everything currently in the store is
        one click away.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg" shine>
          <Link href="/collections">Browse collections</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back to {STORE.name}</Link>
        </Button>
      </div>
    </div>
  );
}
