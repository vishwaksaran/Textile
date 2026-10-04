'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MessageCircle, Phone, Search } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState } from '@/components/admin/ui';
import { Badge } from '@/components/ui/badge';
import { LEAD_STATUSES } from '@/lib/leads';
import { formatDateTime } from '@/lib/utils';
import type { Lead, LeadStatus } from '@/types';

const STATUS_TONE: Record<LeadStatus, 'gold' | 'muted' | 'success' | 'default'> = {
  new: 'gold',
  contacted: 'muted',
  converted: 'success',
  closed: 'default',
};

const control =
  'rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-md text-sm focus:border-deep-maroon focus:outline-none';

/** Filters live in the URL, like the orders list, so the server re-queries. */
export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [term, setTerm] = React.useState(params.get('q') ?? '');

  const update = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            update('q', term);
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Name, phone, city or shop"
            aria-label="Search leads"
            className={`${control} w-full pl-9`}
          />
        </form>

        <select
          value={params.get('status') ?? 'all'}
          onChange={(e) => update('status', e.target.value)}
          aria-label="Filter by status"
          className={`${control} capitalize`}
        >
          <option value="all">Any status</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={params.get('kind') ?? 'all'}
          onChange={(e) => update('kind', e.target.value)}
          aria-label="Filter by type"
          className={control}
        >
          <option value="all">Wholesale & retail</option>
          <option value="wholesale">Wholesale</option>
          <option value="retail">Retail</option>
        </select>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title="No enquiries yet"
          body="Enquiries sent from the Wholesale page and the link on every product page appear here, and are emailed to you as they arrive."
        />
      ) : (
        <ul className="space-y-3">
          {leads.map((lead) => (
            <LeadRow key={lead.id} lead={lead} />
          ))}
        </ul>
      )}

      <p className="font-body-md text-xs text-on-surface-variant">
        Showing {leads.length} enquiries (most recent first, capped at 200).
      </p>
    </div>
  );
}

function LeadRow({ lead: initial }: { lead: Lead }) {
  const [lead, setLead] = React.useState(initial);
  const [notes, setNotes] = React.useState(initial.notes ?? '');
  const [saving, setSaving] = React.useState(false);

  async function save(patch: { status?: LeadStatus; notes?: string }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save');
      setLead(data.lead);
      toast.success('Saved');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const details = [
    lead.business_name,
    lead.city,
    lead.interest,
    lead.quantity,
  ].filter(Boolean);

  return (
    <li className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-body-md text-body-md font-semibold text-deep-maroon">
              {lead.name}
            </span>
            <Badge variant={lead.kind === 'wholesale' ? 'maroon' : 'outline'}>{lead.kind}</Badge>
            <Badge variant={STATUS_TONE[lead.status]}>{lead.status}</Badge>
          </div>
          <p className="font-body-md text-sm tabular-nums text-on-surface">+91 {lead.phone}</p>
          {details.length > 0 && (
            <p className="font-body-md text-sm text-on-surface-variant">{details.join(' · ')}</p>
          )}
          {lead.product_name && (
            <p className="font-body-md text-sm text-on-surface-variant">
              Viewed: <span className="text-on-surface">{lead.product_name}</span>
            </p>
          )}
          {lead.email && (
            <p className="font-body-md text-sm text-on-surface-variant">{lead.email}</p>
          )}
          {lead.message && (
            <p className="whitespace-pre-line pt-1 font-body-md text-sm text-on-surface">
              “{lead.message}”
            </p>
          )}
          <p className="pt-1 font-body-md text-xs text-on-surface-variant">
            {formatDateTime(lead.created_at)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-3 lg:w-72">
          <div className="flex gap-2">
            <a
              href={`https://wa.me/91${lead.phone}?text=${encodeURIComponent(`Hello ${lead.name}, thank you for your enquiry with Sri Laxmi Silks.`)}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => lead.status === 'new' && void save({ status: 'contacted' })}
              className="flex flex-1 items-center justify-center gap-2 rounded bg-deep-maroon px-3 py-2 font-label-sm text-label-sm uppercase tracking-wider text-primary-fixed"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <a
              href={`tel:+91${lead.phone}`}
              className="flex flex-1 items-center justify-center gap-2 rounded border border-primary-container/70 px-3 py-2 font-label-sm text-label-sm uppercase tracking-wider text-deep-maroon"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
          </div>

          <select
            value={lead.status}
            disabled={saving}
            onChange={(e) => void save({ status: e.target.value as LeadStatus })}
            aria-label={`Status for ${lead.name}`}
            className={`${control} capitalize`}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== (lead.notes ?? '') && void save({ notes })}
            placeholder="Notes — what was quoted, when to follow up"
            aria-label={`Notes for ${lead.name}`}
            className={`${control} min-h-[64px] resize-y`}
          />
        </div>
      </div>
    </li>
  );
}
