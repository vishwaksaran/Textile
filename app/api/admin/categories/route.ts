import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { revalidateCatalogue } from '@/lib/revalidate';
import { saveVariantAttributes, errorResponse, validateCategory } from '@/lib/admin-api';
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
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ categories: data });
  } catch (err) {
    return errorResponse(err);
  }
}

/**
 * Null makes it a top-level section. A row cannot be its own parent, which is
 * the one cycle a single-level tree can produce.
 */
function parentOf(body: { parent_id?: unknown; id?: unknown }): string | null {
  return body.parent_id && body.parent_id !== body.id ? String(body.parent_id) : null;
}

/**
 * The end of its own list, spaced by ten.
 *
 * Defaulting to zero put every new category at the top *and* tied with
 * whatever else was there — and the reorder arrows swap positions, so two
 * rows holding the same number could never be separated.
 */
async function nextSortOrder(
  supabase: ReturnType<typeof requireAdminSupabase>,
  parentId: string | null,
): Promise<number> {
  let query = supabase
    .from('categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);

  query = parentId === null ? query.is('parent_id', null) : query.eq('parent_id', parentId);

  const { data } = await query;
  const highest = (data as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0;
  return highest + 10;
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
      is_visible: body.is_visible !== false,
      thumbnail_url: body.thumbnail_url || null,
      seo_title: body.seo_title ? String(body.seo_title).trim() : null,
      seo_description: body.seo_description ? String(body.seo_description).trim() : null,
      sort_order: Number.isFinite(Number(body.sort_order))
        ? Number(body.sort_order)
        : await nextSortOrder(supabase, parentOf(body)),

      // Null makes it a top-level section. A row cannot be its own parent,
      // which is the one cycle a single-level tree can produce.
      parent_id: parentOf(body),
      nav_group: ['sarees', 'standalone', 'hidden'].includes(body.nav_group)
        ? body.nav_group
        : 'sarees',
    };

    const validation = validateCategory(payload);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });

    const { data, error } = await supabase.from('categories').insert(payload).select().single();
    if (error) {
      const message =
        error.code === '23505' ? 'That slug is already in use.' : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (data?.id) await saveVariantAttributes(data.id, body.variantAttributes);

    // Categories drive the storefront nav and the collection listings.
    revalidateCatalogue();

    return NextResponse.json({ category: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
