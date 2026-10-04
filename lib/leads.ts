import { isValidEmail, isValidIndianPhone } from '@/lib/utils';
import type { LeadKind, LeadStatus } from '@/types';

/**
 * Shared by the enquiry form and the route that stores it, so the browser
 * and the server can never disagree about what a valid enquiry is.
 */

export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'converted', 'closed'];

export const LEAD_INTERESTS = [
  'Kanchipuram silk',
  'Banarasi',
  'Soft silk',
  'Khadi & cotton',
  'Bridal',
  'Mixed assortment',
] as const;

export const LEAD_QUANTITIES = [
  '1–10 pieces',
  '10–50 pieces',
  '50–200 pieces',
  '200+ pieces',
] as const;

export interface LeadInput {
  kind: LeadKind;
  name: string;
  phone: string;
  email: string;
  business_name: string;
  city: string;
  interest: string;
  quantity: string;
  message: string;
  product_id: string;
}

/** Field name → message, empty when the enquiry can be stored. */
export type LeadErrors = Partial<Record<keyof LeadInput, string>>;

const MAX = 1000;

/** Trims every field and caps its length, whatever the caller sent. */
export function cleanLeadInput(raw: Record<string, unknown>): LeadInput {
  const text = (key: string) => String(raw[key] ?? '').trim().slice(0, MAX);
  return {
    kind: raw.kind === 'retail' ? 'retail' : 'wholesale',
    name: text('name'),
    phone: text('phone'),
    email: text('email'),
    business_name: text('business_name'),
    city: text('city'),
    interest: text('interest'),
    quantity: text('quantity'),
    message: text('message'),
    product_id: text('product_id'),
  };
}

export function validateLead(input: LeadInput): LeadErrors {
  const errors: LeadErrors = {};
  if (input.name.length < 2) errors.name = 'Please tell us your name.';
  if (!isValidIndianPhone(input.phone)) {
    errors.phone = 'Enter a 10-digit WhatsApp number so we can reply.';
  }
  if (input.email && !isValidEmail(input.email)) errors.email = 'That email does not look right.';
  if (!input.city) errors.city = 'Which city should we quote delivery to?';
  if (input.kind === 'wholesale' && !input.quantity) {
    errors.quantity = 'Roughly how many pieces — it decides the price we quote.';
  }
  return errors;
}
