import type { Metadata } from 'next';
import { STORE } from '@/lib/config';

export const metadata: Metadata = {
  title: { default: 'Admin', template: `%s · Admin | ${STORE.name}` },
  robots: { index: false, follow: false },
};

/**
 * Only carries metadata. The authenticated shell lives in the (dashboard)
 * route group so /admin/login can render outside the guard.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
