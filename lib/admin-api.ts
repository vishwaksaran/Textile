import 'server-only';

import { NextResponse } from 'next/server';
import { UnauthorisedError } from '@/lib/auth';

/** Shared error shaping for every /api/admin route. */
export function errorResponse(err: unknown) {
  if (err instanceof UnauthorisedError) {
    return NextResponse.json({ error: 'Not authorised' }, { status: 401 });
  }
  const message = err instanceof Error ? err.message : 'Something went wrong';
  console.error('[admin-api]', err);
  return NextResponse.json({ error: message }, { status: 500 });
}

export function validateProduct(body: Record<string, unknown>): string | null {
  if (!body.name || String(body.name).trim().length < 2) return 'A product name is required.';

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) return 'Enter a price greater than zero.';

  if (body.discounted_price != null && body.discounted_price !== '') {
    const discounted = Number(body.discounted_price);
    if (!Number.isFinite(discounted) || discounted <= 0) return 'Enter a valid discounted price.';
    if (discounted >= price) return 'The discounted price must be lower than the price.';
  }

  const stock = Number(body.stock_quantity ?? 0);
  if (!Number.isInteger(stock) || stock < 0) {
    return 'Stock must be zero or a positive whole number.';
  }
  return null;
}

export function validateCategory(body: Record<string, unknown>): string | null {
  if (!body.name || String(body.name).trim().length < 2) return 'A category name is required.';
  if (!body.slug || !/^[a-z0-9-]+$/.test(String(body.slug))) {
    return 'The slug may only contain lowercase letters, numbers and hyphens.';
  }
  return null;
}
