import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { LEAD_STATUSES } from '@/lib/leads';
import { requireAdminSupabase } from '@/lib/supabase/server';
import type { LeadStatus } from '@/types';

export const dynamic = 'force-dynamic';

/** Moves a lead along (new → contacted → converted / closed) and keeps notes. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));

    const update: { status?: LeadStatus; notes?: string | null } = {};
    if (body.status !== undefined) {
      if (!LEAD_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Unknown status' }, { status: 400 });
      }
      update.status = body.status;
    }
    if (body.notes !== undefined) {
      update.notes = String(body.notes).trim().slice(0, 2000) || null;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await requireAdminSupabase()
      .from('leads')
      .update(update)
      .eq('id', params.id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ lead: data });
  } catch (err) {
    return errorResponse(err);
  }
}
