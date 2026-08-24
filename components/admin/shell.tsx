'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminTopbar } from '@/components/admin/topbar';

/**
 * App shell: a fixed sidebar with its own scroll, and a content column that
 * scrolls independently beneath a sticky top bar.
 */
export function AdminShell({
  adminName,
  children,
}: {
  adminName: string;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <AdminSidebar
        adminName={adminName}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col bg-surface-container lg:ml-80">
        <Suspense fallback={<div className="h-20 flex-none border-b border-outline-variant bg-surface" />}>
          <AdminTopbar onOpenMenu={() => setMenuOpen(true)} />
        </Suspense>

        <main id="main" className="flex-1 overflow-y-auto p-5 lg:p-8">
          <div className="mx-auto max-w-container-max">{children}</div>
        </main>
      </div>
    </div>
  );
}
