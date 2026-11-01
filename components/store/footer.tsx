import Link from 'next/link';
import { ArrowRight, MessageCircle, Phone } from 'lucide-react';
import { STORE, storeAddressLines, storeHoursLines, whatsappUrl } from '@/lib/config';
import { splitNavCategories } from '@/lib/nav';
import { SocialIcon, type SocialNetwork } from '@/components/store/social-icons';
import { LogoMark } from '@/components/store/logo';
import type { Category } from '@/types';

const EXPLORE = [
  { href: '/collections', label: 'All Collections' },
  { href: '/story', label: 'About Us' },
  { href: '/contact', label: 'Contact Us' },
  { href: '/visit', label: 'Visit the Shop' },
  { href: '/wholesale', label: 'Wholesale Enquiries' },
  { href: '/budget-sarees', label: 'Budget Sarees' },
  { href: '/authenticity', label: 'How We Describe Our Sarees' },
  { href: '/faq', label: 'Questions, Answered' },
];

const CARE = [
  { href: '/shipping', label: 'Shipping Policy' },
  { href: '/returns', label: 'Return & Exchange Policy' },
  { href: '/track', label: 'Track Your Order' },
  { href: '/privacy', label: 'Privacy Policy' },
];

export function Footer({ categories = [] }: { categories?: Category[] }) {
  const { sarees, standalone } = splitNavCategories(categories);

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
          <Link
            href="/wholesale"
            className="inline-flex items-center gap-2 rounded border border-primary-container px-4 py-2 font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed transition-colors hover:bg-primary-container/10"
          >
            Wholesale Enquiries
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>

        {/* Weaves and other garments are listed apart here for the same reason
            they are in the nav: "Shop by Weave" is not where anyone looks for
            unstitched churidar material. */}
        <FooterColumn
          title="Shop by Weave"
          links={[
            ...sarees.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
            ...standalone.map((c) => ({ href: `/category/${c.slug}`, label: c.name })),
            { href: '/collections', label: 'All Collections' },
          ]}
        />
        <FooterColumn title="Explore" links={EXPLORE} />
        <FooterColumn title="Customer Care" links={CARE} />

        <div className="space-y-4">
          <h2 className="font-label-sm text-label-sm uppercase tracking-widest text-primary-fixed">
            Stay Connected
          </h2>

          <SocialRow />

          {/*
            This used to be an email sign-up that thanked people and stored
            nothing. WhatsApp is where the shop actually answers, so the
            footer points there instead of collecting addresses into a void.
          */}
          <p className="font-body-md text-sm text-warm-cream/80">
            Ask about a piece, an order or wholesale prices — we reply on WhatsApp during shop
            hours.
          </p>

          <div className="flex flex-col gap-2">
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-body-md text-sm text-warm-cream/80 transition-colors hover:text-primary-fixed-dim"
            >
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              WhatsApp {STORE.phone}
            </a>
            <a
              href={`tel:${STORE.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-2 font-body-md text-sm text-warm-cream/80 transition-colors hover:text-primary-fixed-dim"
            >
              <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              Call {STORE.phone}
            </a>
          </div>
        </div>
      </div>

      <div className="container-page flex flex-col items-center justify-between gap-4 border-t border-primary-container/30 pb-8 pt-4 md:flex-row">
        <p className="font-body-md text-xs text-warm-cream/80">
          © {new Date().getFullYear()} {STORE.legalName}. Wholesale &amp; retail sarees, Town Hall, Coimbatore.
        </p>
        <p className="font-body-md text-xs text-warm-cream/80">
          GSTIN {STORE.gstin}
        </p>
      </div>
    </footer>
  );
}

const SOCIALS: { network: SocialNetwork; label: string; href: string }[] = [
  { network: 'instagram', label: 'Instagram', href: STORE.social.instagram },
  { network: 'youtube', label: 'YouTube', href: STORE.social.youtube },
  { network: 'whatsapp', label: 'WhatsApp group', href: STORE.social.whatsappGroup },
  { network: 'facebook', label: 'Facebook', href: STORE.social.facebook },
];

/**
 * The shop's profiles, as marks rather than initials.
 *
 * Renders nothing at all when no profile is configured. An empty row of
 * buttons is an invitation to click something that does not exist, and the
 * previous version was worse still — it linked the word Instagram to
 * instagram.com, sending an interested customer to a front page that has
 * never heard of this shop.
 */
function SocialRow() {
  const live = SOCIALS.filter((s) => s.href);
  if (live.length === 0) return null;

  return (
    <div className="flex gap-3">
      {live.map(({ network, label, href }) => (
        <a
          key={network}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={`${STORE.name} on ${label}`}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-primary-container/40 text-primary-fixed transition-colors hover:border-primary-fixed hover:bg-primary-container/15"
        >
          <SocialIcon network={network} />
        </a>
      ))}
    </div>
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
