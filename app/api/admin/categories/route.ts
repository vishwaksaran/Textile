import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { revalidateCatalogue } from '@/lib/revalidate';
import { errorResponse, validateCategory } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ categories: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const body = await request.json();

    const payload = {
      name: String(body.name ?? '').trim(),
      slug: slugify(String(body.slug || body.name || '')),
      description: body.description ?? null,
      image_url: body.image_url ?? null,
    };

    const validation = validateCategory(payload);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });

    const { data, error } = await supabase.from('categories').insert(payload).select().single();
    if (error) {
      const message =
        error.code === '23505' ? 'That slug is already in use.' : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    // Categories drive the storefront nav and the collection listings.
    revalidateCatalogue();

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
