import { NextResponse } from 'next/server';
import { cleanLeadInput, validateLead } from '@/lib/leads';
import { sendAdminLeadEmail } from '@/lib/notifications/email';
import { createAdminSupabase } from '@/lib/supabase/server';
import { normalisePhone } from '@/lib/utils';
import type { Lead } from '@/types';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public: stores an enquiry and tells the shop.
 *
 * Validation is repeated here because the form's is only a courtesy. The
 * `website` field is a honeypot — hidden from people, filled in by bots —
 * and a filled one is answered with success so the bot has nothing to learn.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (String(body.website ?? '').trim()) return NextResponse.json({ ok: true });

  const input = cleanLeadInput(body);
  const errors = validateLead(input);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: 'Please check the form.', errors }, { status: 422 });
  }

  const supabase = createAdminSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Enquiries are not switched on yet. Please message us on WhatsApp.' },
      { status: 503 },
    );
  }

  const phone = normalisePhone(input.phone);

  // A double-tap, or a second try after a slow network, is the same person
  // asking once. Ten minutes is long enough to absorb that and short enough
  // that a genuine follow-up later still gets through.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from('leads')
    .select('id')
    .eq('phone', phone)
    .gte('created_at', since)
    .limit(1);
  if (recent && recent.length > 0) return NextResponse.json({ ok: true });

  // Freeze the name of the piece they were looking at, read from our own
  // catalogue rather than trusted from the browser.
  let productName: string | null = null;
  if (UUID.test(input.product_id)) {
    const { data: product } = await supabase
      .from('products')
      .select('name')
      .eq('id', input.product_id)
      .maybeSingle();
    productName = product?.name ?? null;
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      kind: input.kind,
      name: input.name,
      phone,
      email: input.email || null,
      business_name: input.business_name || null,
      city: input.city,
      interest: input.interest || null,
      quantity: input.quantity || null,
      message: input.message || null,
      product_id: productName ? input.product_id : null,
      product_name: productName,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('[leads] could not store enquiry', error);
    return NextResponse.json(
      { error: 'We could not send that just now. Please message us on WhatsApp.' },
      { status: 500 },
    );
  }

  // The lead is already safe in the table, so a failed alert is logged
  // rather than shown to the customer — the admin list still has it.
  const alert = await sendAdminLeadEmail(data as Lead);
  if (!alert.sent) {
    console.error(`[leads] alert not sent for ${data.id}: ${alert.error ?? alert.skipped}`);
  }

  return NextResponse.json({ ok: true });
}
