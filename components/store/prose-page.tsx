import { Breadcrumbs } from '@/components/store/breadcrumbs';
import { AnimatedPage } from '@/components/shared/motion';

interface ProsePageProps {
  eyebrow: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
}

/** Shared layout for the store's editorial and policy pages. */
export function ProsePage({ eyebrow, title, intro, children }: ProsePageProps) {
  return (
    <AnimatedPage>
      <div className="container-page pt-6">
        <Breadcrumbs trail={[{ label: 'Home', href: '/' }, { label: title }]} />
      </div>

      <article className="container-page py-12">
        <header className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-earthy-bronze">
            {eyebrow}
          </p>
          <h1 className="mb-5 font-display-lg text-[34px] leading-tight text-deep-maroon md:text-[44px] md:leading-[52px]">
            {title}
          </h1>
          {intro && (
            <p className="font-body-lg text-body-lg text-on-surface-variant">{intro}</p>
          )}
        </header>

        <div className="mx-auto max-w-2xl space-y-6 font-body-md text-body-md leading-relaxed text-on-surface-variant [&_a]:text-deep-maroon [&_a]:underline [&_h2]:pt-4 [&_h2]:font-headline-md [&_h2]:text-headline-md [&_h2]:text-deep-maroon [&_li]:pl-1 [&_strong]:text-on-surface [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </AnimatedPage>
  );
}
