import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CodeText } from '@/components/ui/code-text';
import { cn } from '@/lib/utils';
import type { OrderStatus, PaymentStatus } from '@/types';

/** Page heading shared by every admin screen. */
export function AdminHeader({
  title,
  subtitle,
  code,
  codeSecondary,
  action,
}: {
  title: string;
  subtitle?: string;
  /** An identifier shown beside the title — set in the legible body face. */
  code?: string;
  /** A second, quieter identifier, e.g. the invoice number. */
  codeSecondary?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-headline-lg text-headline-lg text-deep-maroon">{title}</h1>
          {/* Deliberately outside the h1's display serif: a code is read back
              over the phone or checked against a parcel, so it needs the body
              face and fixed-width numerals. */}
          {code && (
            <CodeText className="select-all text-[20px] text-deep-maroon">{code}</CodeText>
          )}
        </div>
        {(subtitle || codeSecondary) && (
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
            {subtitle}
            {subtitle && codeSecondary && ' · '}
            {codeSecondary && <CodeText className="font-normal">{codeSecondary}</CodeText>}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/** The shell supplies padding and max width; this only spaces the sections. */
export function AdminPage({ children }: { children: React.ReactNode }) {
  return <div className="space-y-8">{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  Icon,
  href,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  Icon: LucideIcon;
  href?: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  const body = (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-lg border bg-surface-container-lowest p-5 transition-colors',
        tone === 'warning'
          ? 'border-primary-container/60'
          : tone === 'success'
            ? 'border-success/30'
            : 'border-outline-variant/40',
        href && 'hover:border-primary-container',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          {label}
        </span>
        <Icon className="h-4 w-4 text-earthy-bronze" strokeWidth={1.5} />
      </div>
      <span className="font-headline-lg text-[28px] leading-none text-deep-maroon">{value}</span>
      {hint && <span className="font-body-md text-xs text-on-surface-variant">{hint}</span>}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

const ORDER_TONE: Record<OrderStatus, 'muted' | 'gold' | 'success' | 'error'> = {
  processing: 'gold',
  shipped: 'muted',
  delivered: 'success',
  cancelled: 'error',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_TONE[status] ?? 'muted'}>{status}</Badge>;
}

const PAYMENT_TONE: Record<PaymentStatus, 'success' | 'warning' | 'error'> = {
  paid: 'success',
  pending: 'warning',
  failed: 'error',
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_TONE[status] ?? 'muted'}>{status}</Badge>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant py-16 text-center">
      <p className="font-headline-md text-headline-md text-deep-maroon">{title}</p>
      <p className="mx-auto mt-2 max-w-md font-body-md text-body-md text-on-surface-variant">
        {body}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
