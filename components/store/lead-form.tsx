'use client';

import * as React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/input';
import {
  LEAD_INTERESTS,
  LEAD_QUANTITIES,
  validateLead,
  type LeadErrors,
  type LeadInput,
} from '@/lib/leads';
import { whatsappUrl } from '@/lib/config';
import { cn } from '@/lib/utils';
import type { LeadKind } from '@/types';

/**
 * The enquiry form on /wholesale.
 *
 * Asks only what changes the reply: who to call back, where the goods would
 * go, and — for a reseller — roughly how many pieces, because that is what
 * the price depends on. Everything else is optional, so a buyer on a phone
 * can send it in under a minute.
 */
export function LeadForm({
  product,
  initialKind = 'wholesale',
}: {
  product?: { id: string; name: string } | null;
  initialKind?: LeadKind;
}) {
  const [details, setDetails] = React.useState<LeadInput>({
    kind: initialKind,
    name: '',
    phone: '',
    email: '',
    business_name: '',
    city: '',
    interest: '',
    quantity: '',
    message: '',
    product_id: product?.id ?? '',
  });
  const [website, setWebsite] = React.useState('');
  const [errors, setErrors] = React.useState<LeadErrors>({});
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const wholesale = details.kind === 'wholesale';

  function set<K extends keyof LeadInput>(key: K, value: LeadInput[K]) {
    setDetails((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function submit() {
    const found = validateLead(details);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Please check the highlighted fields.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...details, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        toast.error(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setSent(true);
    } catch {
      toast.error('No connection. Please try again, or message us on WhatsApp.');
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-success/30 bg-surface-container-lowest p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" strokeWidth={1.5} />
        <p className="font-headline-md text-headline-md text-deep-maroon">Thank you, {details.name}</p>
        <p className="mx-auto mt-2 max-w-md font-body-md text-body-md text-on-surface-variant">
          We will call or WhatsApp you on +91 {details.phone} within one working day
          {wholesale ? ' with prices for your quantity' : ''}.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <a href={whatsappUrl()} target="_blank" rel="noreferrer">
            Or message us now
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-6 rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-6 sm:p-8"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <fieldset>
        <legend className="mb-3 font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">
          I am buying
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ['wholesale', 'For my shop', 'Wholesale / resale'],
              ['retail', 'For myself', 'Bridal, family, gifting'],
            ] as const
          ).map(([kind, title, note]) => (
            <label
              key={kind}
              className={cn(
                'cursor-pointer rounded border p-3 transition-colors',
                details.kind === kind
                  ? 'border-deep-maroon bg-primary-container/10'
                  : 'border-outline-variant hover:border-primary-container',
              )}
            >
              <input
                type="radio"
                name="kind"
                value={kind}
                checked={details.kind === kind}
                onChange={() => set('kind', kind)}
                className="sr-only"
              />
              <span className="block font-body-md text-body-md font-semibold text-deep-maroon">
                {title}
              </span>
              <span className="block font-body-md text-xs text-on-surface-variant">{note}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {product && (
        <p className="rounded bg-surface-container-low px-4 py-3 font-body-md text-sm text-on-surface-variant">
          Asking about: <strong className="text-deep-maroon">{product.name}</strong>
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="lead-name" error={errors.name} required>
          <Input
            id="lead-name"
            autoComplete="name"
            value={details.name}
            onChange={(e) => set('name', e.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field label="WhatsApp number" htmlFor="lead-phone" error={errors.phone} required>
          <div className="flex items-center gap-2">
            <span className="font-body-md text-body-md text-on-surface-variant">+91</span>
            <Input
              id="lead-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={11}
              placeholder="98765 43210"
              value={details.phone}
              onChange={(e) => set('phone', e.target.value.replace(/[^\d\s]/g, ''))}
              aria-invalid={Boolean(errors.phone)}
            />
          </div>
        </Field>

        {wholesale && (
          <Field label="Shop / business name" htmlFor="lead-business">
            <Input
              id="lead-business"
              autoComplete="organization"
              value={details.business_name}
              onChange={(e) => set('business_name', e.target.value)}
            />
          </Field>
        )}

        <Field label="City" htmlFor="lead-city" error={errors.city} required>
          <Input
            id="lead-city"
            autoComplete="address-level2"
            value={details.city}
            onChange={(e) => set('city', e.target.value)}
            aria-invalid={Boolean(errors.city)}
          />
        </Field>

        <Field label="Interested in" htmlFor="lead-interest">
          <Select
            id="lead-interest"
            value={details.interest}
            onChange={(e) => set('interest', e.target.value)}
          >
            <option value="">Choose…</option>
            {LEAD_INTERESTS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </Select>
        </Field>

        {wholesale && (
          <Field label="Quantity" htmlFor="lead-quantity" error={errors.quantity} required>
            <Select
              id="lead-quantity"
              value={details.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              aria-invalid={Boolean(errors.quantity)}
            >
              <option value="">Choose…</option>
              {LEAD_QUANTITIES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Email" htmlFor="lead-email" error={errors.email} hint="Optional.">
          <Input
            id="lead-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={details.email}
            onChange={(e) => set('email', e.target.value)}
            aria-invalid={Boolean(errors.email)}
          />
        </Field>
      </div>

      <Field label="Anything else" htmlFor="lead-message" hint="Colours, budget, occasion, a date you need them by.">
        <Textarea
          id="lead-message"
          value={details.message}
          onChange={(e) => set('message', e.target.value)}
          className="min-h-[90px]"
        />
      </Field>

      {/* Honeypot: invisible to people, irresistible to form-filling bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="lead-website">Website</label>
        <input
          id="lead-website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={sending}>
        {sending ? 'Sending…' : wholesale ? 'Request wholesale prices' : 'Send enquiry'}
      </Button>
      <p className="text-center font-body-md text-xs text-on-surface-variant">
        We reply within one working day. Your number is used only to answer this enquiry.
      </p>
    </form>
  );
}
