import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Libre_Franklin } from 'next/font/google';
import { STORE, appUrl } from '@/lib/config';
import { Toaster } from '@/components/shared/toaster';
import './globals.css';

/*
  No `weight` array: next/font resolves both families to their variable cut,
  which covers every weight the type scale uses from one file per style.
  Listing weights explicitly produced byte-identical output, so this is only
  the simpler spelling — not a saving.

  The italic face is a second file and is genuinely used, by the headline
  italics on the home, collections and related-products headings.
*/
const display = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const body = Libre_Franklin({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

/*
  The default title leads with what people search for, not with the shop name.
  Nobody is searching "Sri Laxmi Silks" yet — they search "handloom silk saree
  online" or "silk saree shop Coimbatore" — so the brand sits after the terms
  that can actually be matched. Every other page keeps brand-last through the
  template. Both stay inside the ~60 characters Google shows before truncating.
*/
export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: `Handloom Silk Sarees — ${STORE.name}, ${STORE.address.area} ${STORE.address.city}`,
    template: `%s | ${STORE.name}`,
  },
  description:
    'Silk saree shop on Big Bazaar Street, Town Hall, Coimbatore. Kanchipuram, Banarasi, khadi cotton and bridal weaves — in store, and shipped across India.',
  keywords: [
    'handloom sarees',
    'Kanchipuram silk saree',
    'Banarasi saree',
    'khadi cotton saree',
    'bridal silk saree',
    'saree shop Town Hall Coimbatore',
    'silk saree shop Coimbatore',
  ],
  openGraph: {
    title: `Handloom Silk Sarees Online — ${STORE.name}`,
    description:
      'Kanchipuram, Banarasi and khadi cotton sarees, woven by hand and shipped across India.',
    type: 'website',
    locale: 'en_IN',
    siteName: STORE.name,
  },
  // Search Console verification. Set GOOGLE_SITE_VERIFICATION once Google
  // gives you the token; leaving it unset simply omits the tag.
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
};

export const viewport: Viewport = {
  themeColor: '#4A0404',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded focus:bg-deep-maroon focus:px-4 focus:py-2 focus:font-label-sm focus:text-label-sm focus:uppercase focus:text-primary-fixed"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
