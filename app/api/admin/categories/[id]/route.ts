import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { revalidateCatalogue } from '@/lib/revalidate';
import { errorResponse, validateCategory } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';
import { slugify } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const body = await request.json();

    const payload = {
      name: String(body.name ?? '').trim(),
      slug: slugify(String(body.slug || body.name || '')),
      description: body.description ?? null,
      image_url: body.image_url ?? null,
      // Only the three known placements; anything else falls back to the
      // dropdown, which is where a weave belongs.
      is_visible: body.is_visible !== false,
      thumbnail_url: body.thumbnail_url || null,
      seo_title: body.seo_title ? String(body.seo_title).trim() : null,
      seo_description: body.seo_description ? String(body.seo_description).trim() : null,
      sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,

      // Null makes it a top-level section. A row cannot be its own parent,
      // which is the one cycle a single-level tree can produce.
      parent_id:
        body.parent_id && body.parent_id !== body.id ? String(body.parent_id) : null,
      nav_group: ['sarees', 'standalone', 'hidden'].includes(body.nav_group)
        ? body.nav_group
        : 'sarees',
    };

    const validation = validateCategory(payload);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      const message = error.code === '23505' ? 'That slug is already in use.' : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
    // Categories drive the storefront nav and the collection listings.
    revalidateCatalogue();

    return NextResponse.json({ category: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();

    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', params.id);

    if ((count ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `This collection still holds ${count} ${count === 1 ? 'piece' : 'pieces'}. Move them first.`,
        },
        { status: 409 },
      );
    }

    // A section still holding subcategories is refused by the foreign key.
    // Saying so plainly beats surfacing a constraint name.
    const { count: children } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('parent_id', params.id);

    if ((children ?? 0) > 0) {
      return NextResponse.json(
        {
          error: `This section still contains ${children} ${children === 1 ? 'subcategory' : 'subcategories'}. Delete or move them first.`,
        },
        { status: 409 },
      );
    }

    const { error } = await supabase.from('categories').delete().eq('id', params.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
