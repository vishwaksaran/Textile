'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu, Search } from 'lucide-react';

const TITLES: [RegExp, string][] = [
  [/^\/admin$/, 'Overview'],
  [/^\/admin\/orders$/, 'Order Management'],
  [/^\/admin\/orders\/.+/, 'Order Detail'],
  [/^\/admin\/categories/, 'Category Management'],
  [/^\/admin\/products\/new$/, 'New Product'],
  [/^\/admin\/products\/.+/, 'Edit Product'],
  [/^\/admin\/products$/, 'Inventory'],
];

/** Where the top-bar search box writes its term, per section. */
const SEARCHABLE: Record<string, string> = {
  '/admin/orders': 'Search orders…',
  '/admin/products': 'Search inventory…',
  '/admin/categories': 'Search categories…',
};

export function AdminTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();

  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? 'Admin';
  const placeholder = SEARCHABLE[pathname];
  const [term, setTerm] = React.useState(params.get('q') ?? '');

  // Keep the box in step when the URL changes underneath it.
  React.useEffect(() => setTerm(params.get('q') ?? ''), [params]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (term.trim()) next.set('q', term.trim());
    else next.delete('q');
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <header className="z-40 flex h-20 flex-none items-center justify-between border-b border-outline-variant bg-surface px-5 shadow-sm lg:px-8">
      <div className="flex min-w-0 items-center gap-4">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open admin menu"
          className="rounded p-2 text-on-surface lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="truncate font-headline-md text-headline-md text-on-surface">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {placeholder && (
          <form onSubmit={submit} className="relative hidden sm:block">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
              aria-hidden="true"
            />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="w-64 rounded-full border-none bg-surface-container-highest py-2 pl-10 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:ring-1 focus:ring-primary-container"
            />
          </form>
        )}
      </div>
    </header>
  );
}
