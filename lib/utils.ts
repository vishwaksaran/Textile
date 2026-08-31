import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** ₹24,500 — Indian digit grouping, no paise unless the amount has them. */
export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  const hasPaise = Math.round(amount * 100) % 100 !== 0;
  return hasPaise
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
      }).format(amount)
    : inr.format(amount);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return `${formatDate(d)}, ${d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The effective price a customer pays for a product. */
/**
 * How an order line is named on an invoice, in an email and in the admin.
 *
 * Reads variant_at_time, the label frozen at the sale, and never the live
 * variant: a size renamed or retired next season must not rewrite a receipt
 * that has already been issued.
 */
export function describeItem(item: {
  variant_at_time?: string | null;
  products?: { name?: string | null } | null;
}): string {
  const name = item.products?.name ?? 'Handloom piece';
  return item.variant_at_time ? `${name} — ${item.variant_at_time}` : name;
}

export function effectivePrice(p: { price: number; discounted_price: number | null }): number {
  return p.discounted_price && p.discounted_price > 0 && p.discounted_price < p.price
    ? p.discounted_price
    : p.price;
}

export function discountPercent(p: { price: number; discounted_price: number | null }): number | null {
  if (!p.discounted_price || p.discounted_price >= p.price) return null;
  return Math.round(((p.price - p.discounted_price) / p.price) * 100);
}

/** Strips everything but digits and drops a leading 91/0 so we store 10 digits. */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) return digits.slice(-10);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits.slice(-10);
}

export function isValidIndianPhone(raw: string): boolean {
  return /^[6-9]\d{9}$/.test(normalisePhone(raw));
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
}

export function isValidPincode(raw: string): boolean {
  return /^[1-9]\d{5}$/.test(raw.trim());
}

/** Short, human-quotable form of a UUID order id. */
export function shortOrderId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export function invoiceNumber(orderId: string, createdAt: string | Date): string {
  const year = new Date(createdAt).getFullYear();
  return `INV-${year}-${shortOrderId(orderId)}`;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
