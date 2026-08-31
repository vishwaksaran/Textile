import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';
import { revalidateCatalogue } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

/**
 * Shapes and checks one slide.
 *
 * `cta_href` is restricted to paths on this site. It is rendered as the
 * biggest button on the front page, so an absolute URL pasted in here would
 * become an open redirect on the shop's most-clicked link — and an admin who
 * wanted to send visitors elsewhere has no reason to do it from the banner.
 */
function slideFrom(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim();
  if (title.length < 2) throw new Error('Give the slide a headline.');

  const imageUrl = String(body.image_url ?? '').trim();
  if (!imageUrl) throw new Error('A slide needs an image.');

  let href: string | null = String(body.cta_href ?? '').trim() || null;
  if (href && !href.startsWith('/')) {
    throw new Error('The button link must be a path on this site, starting with "/".');
  }

  const label = String(body.cta_label ?? '').trim() || null;
  // A button with no destination is a dead end; a destination with no label
  // is invisible. Either both or neither.
  if ((label && !href) || (href && !label)) {
    throw new Error('Give the button both a label and a link, or leave both empty.');
  }

  return {
    eyebrow: String(body.eyebrow ?? '').trim() || null,
    title,
    body: String(body.body ?? '').trim() || null,
    image_url: imageUrl,
    cta_label: label,
    cta_href: href,
    sort_order: Number.isFinite(Number(body.sort_order)) ? Number(body.sort_order) : 0,
    is_active: body.is_active !== false,
  };
}

export async function GET() {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const { data, error } = await supabase
      .from('hero_slides')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ slides: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const body = await request.json();

    const { data, error } = await supabase
      .from('hero_slides')
      .insert(slideFrom(body))
      .select()
      .single();

    if (error) throw new Error(error.message);
    // The home page is statically generated; without this the new banner
    // waits out its revalidate window before anyone sees it.
    revalidateCatalogue();
    return NextResponse.json({ slide: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const body = await request.json();
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'Which slide?' }, { status: 400 });

    const { data, error } = await supabase
      .from('hero_slides')
      .update(slideFrom(body))
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    revalidateCatalogue();
    return NextResponse.json({ slide: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Which slide?' }, { status: 400 });

    const { error } = await supabase.from('hero_slides').delete().eq('id', id);
    if (error) throw new Error(error.message);
    revalidateCatalogue();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
