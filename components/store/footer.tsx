'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { STORE, storeAddressLines, storeHoursLines } from '@/lib/config';
import { isValidEmail } from '@/lib/utils';
import { LogoMark } from '@/components/store/logo';
import type { Category } from '@/types';

const EXPLORE = [
  { href: '/collections', label: 'All Collections' },
  { href: '/story', label: 'Our Story' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/visit', label: 'Visit the Shop' },
  { href: '/authenticity', label: 'Authenticity Guarantee' },
  { href: '/faq', label: 'Questions, Answered' },
];

const CARE = [
  { href: '/shipping', label: 'Shipping Policy' },
  { href: '/returns', label: 'Returns & Exchanges' },
  { href: '/track', label: 'Track Your Order' },
  { href: '/privacy', label: 'Privacy Policy' },
];

export function Footer({ categories = [] }: { categories?: Category[] }) {
  const [email, setEmail] = React.useState('');

  function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    setEmail('');
    toast.success('You are on the list.', {
      description: 'We will write when new weaves come off the loom.',
    });
  }

  return (
    <footer className="mt-auto w-full border-t-4 border-primary-container bg-deep-maroon">
      <div className="container-page grid grid-cols-1 gap-gutter py-16 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-primary-fixed">
            <LogoMark className="h-10" invert />
            <span className="font-display-lg text-2xl">{STORE.name}</span>
          </div>
          <p className="font-body-md text-sm text-warm-cream/80">{STORE.tagline}</p>
          <address className="font-body-md text-sm not-italic leading-relaxed text-warm-cream/80">
            {storeAddressLines().map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
          <p className="font-body-md text-sm text-warm-cream/80">
            {storeHoursLines().join(' · ')}
          </p>
        </div>

        <FooterColumn
          title="Shop by Weave"
          links={[
            ...categories.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
            { href: '/collections', label: 'All Collections' },
          ]}
        />
        <FooterColumn title="Explore" links={EXPLORE} />
        <FooterColumn title="Customer Care" links={CARE} />

        <div className="space-y-4">
          <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed">
            Newsletter
          </h2>
          <p className="font-body-md text-sm text-warm-cream/80">
            Join our journal for tales of textiles and new arrivals.
          </p>
          <form className="flex items-center gap-3" onSubmit={subscribe} noValidate>
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="min-w-0 flex-grow border-0 border-b border-primary-container bg-transparent px-0 py-2 font-body-md text-sm text-warm-cream placeholder:text-warm-cream/50 focus:border-primary-fixed focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              aria-label="Subscribe"
              className="rounded p-2 text-primary-fixed transition-colors hover:text-primary-fixed-dim"
            >
              <ArrowRight className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>

      <div className="container-page flex flex-col items-center justify-between gap-4 border-t border-primary-container/30 pb-8 pt-4 md:flex-row">
        <p className="font-body-md text-xs text-warm-cream/80">
          © {new Date().getFullYear()} {STORE.legalName}. Handcrafted Excellence.
        </p>
        <div className="flex gap-4">
          <a
            href="https://instagram.com"
            className="font-label-sm text-label-sm text-warm-cream/80 transition-colors hover:text-primary-fixed-dim"
            aria-label="Instagram"
          >
            IG
          </a>
          <a
            href="https://pinterest.com"
            className="font-label-sm text-label-sm text-warm-cream/80 transition-colors hover:text-primary-fixed-dim"
            aria-label="Pinterest"
          >
            PT
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed">
        {title}
      </h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block font-body-md text-sm text-warm-cream/80 transition-colors hover:text-primary-fixed-dim"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
