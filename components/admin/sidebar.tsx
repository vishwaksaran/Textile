'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Tags,
  Boxes,
  LogOut,
  X,
  Leaf,
  HelpCircle,
} from 'lucide-react';
import { createClient, supabaseConfigured } from '@/lib/supabase/client';
import { STORE } from '@/lib/config';
import { ADMIN_PORTRAIT } from '@/lib/demo-data';
import { cn } from '@/lib/utils';

export const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', Icon: LayoutDashboard, exact: true },
  { href: '/admin/orders', label: 'Orders', Icon: ShoppingCart },
  { href: '/admin/categories', label: 'Category Manager', Icon: Tags },
  { href: '/admin/products', label: 'Inventory', Icon: Boxes },
];

export function AdminSidebar({
  adminName,
  open,
  onClose,
}: {
  adminName: string;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    if (open) onClose();
    // Close the drawer whenever the route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function signOut() {
    if (supabaseConfigured) await createClient().auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  const panel = (
    <div className="flex h-full w-80 flex-col bg-surface-container-lowest py-8 shadow-2xl">
      <div className="mb-8 px-8 text-center">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 className="flex-1 font-headline-md text-headline-md text-primary">
            Welcome to {STORE.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-2 -mt-1 rounded p-1.5 text-on-surface-variant lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          {STORE.tagline}
        </p>

        <div className="relative mt-4 h-24 w-full overflow-hidden rounded-full bg-surface-variant">
          <Image
            src={ADMIN_PORTRAIT}
            alt=""
            fill
            sizes="256px"
            quality={85}
            className="object-cover"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4" aria-label="Admin">
        {ADMIN_NAV.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'mx-4 flex items-center gap-4 rounded-full px-6 py-3 transition-all',
                active
                  ? 'translate-x-1 bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="font-label-sm text-label-sm uppercase tracking-widest">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-8">
        <div className="zari-divider mb-6" />

        <Link
          href="/"
          target="_blank"
          className="block w-full bg-deep-maroon py-3 text-center font-label-lg text-label-lg uppercase tracking-wider text-primary-fixed shadow-sm transition-colors hover:bg-secondary"
        >
          View Latest Collection
        </Link>

        <button
          type="button"
          onClick={signOut}
          className="mt-3 flex w-full items-center justify-center gap-2 py-2 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant transition-colors hover:text-error"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign out
        </button>

        <div className="mt-4 flex justify-center gap-4">
          <Link
            href="/contact"
            className="flex items-center gap-1 text-on-surface-variant transition-colors hover:text-primary"
          >
            <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
            <span className="font-label-sm text-label-sm">Help Center</span>
          </Link>
          <Link
            href="/story"
            className="flex items-center gap-1 text-on-surface-variant transition-colors hover:text-primary"
          >
            <Leaf className="h-4 w-4" strokeWidth={1.5} />
            <span className="font-label-sm text-label-sm">Sustainability</span>
          </Link>
        </div>

        <p className="mt-4 truncate text-center font-body-md text-xs text-on-surface-variant/70">
          {adminName}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-50 hidden lg:block">{panel}</aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-deep-maroon/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative h-full">{panel}</div>
        </div>
      )}
    </>
  );
}
