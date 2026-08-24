import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Libre_Franklin } from 'next/font/google';
import { STORE, appUrl } from '@/lib/config';
import { Toaster } from '@/components/shared/toaster';
import './globals.css';

const display = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const body = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: `${STORE.name} — ${STORE.tagline}`,
    template: `%s | ${STORE.name}`,
  },
  description:
    'Handloom silk sarees, Banarasi brocade and khadi cotton from Coimbatore. Woven narratives of timeless luxury, shipped across India.',
  openGraph: {
    title: `${STORE.name} — ${STORE.tagline}`,
    description:
      'Handloom silk sarees, Banarasi brocade and khadi cotton, woven by hand and shipped across India.',
    type: 'website',
    locale: 'en_IN',
  },
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
