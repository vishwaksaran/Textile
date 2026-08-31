import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { revalidateCatalogue } from '@/lib/revalidate';
import { saveProductAttributeValues } from '@/lib/attributes';
import {
  getVariantAxes,
  parseOptionDetails,
  parseVariantDrafts,
  saveOptionDetails,
  saveProductVariants,
} from '@/lib/variants';
import { errorResponse, validateProduct } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SELECT = '*, categories:category_id (id, name, slug)';


export async function GET(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const { searchParams } = new URL(request.url);

    let query = supabase.from('products').select(SELECT, { count: 'exact' });

    const search = searchParams.get('q');
    if (search) query = query.ilike('name', `%${search}%`);

    const categoryId = searchParams.get('category_id');
    if (categoryId) query = query.eq('category_id', categoryId);

    const stock = searchParams.get('stock');
    if (stock === 'out') query = query.lte('stock_quantity', 0);
    if (stock === 'low') query = query.gt('stock_quantity', 0).lt('stock_quantity', 5);

    const { data, error, count } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return NextResponse.json({ products: data, total: count ?? data?.length ?? 0 });
  } catch (err) {
    return errorResponse(err);
  }
}


export async function POST(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const body = await request.json();

    const validation = validateProduct(body);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });

    const stock = Number(body.stock_quantity ?? 0);
    const { data, error } = await supabase
      .from('products')
      .insert({
        name: String(body.name).trim(),
        description: body.description ?? null,
        price: Number(body.price),
        discounted_price: body.discounted_price ? Number(body.discounted_price) : null,
        stock_quantity: stock,
        category_id: body.category_id || null,
        // Null means "fall back to the shop-wide default at invoice time".
        hsn_code: body.hsn_code ? String(body.hsn_code).trim() : null,
        gst_rate:
          body.gst_rate === null || body.gst_rate === undefined || body.gst_rate === ''
            ? null
            : Number(body.gst_rate),
        images: Array.isArray(body.images) ? body.images : [],
        is_sold_out: stock <= 0,
        is_active: body.is_active !== false,
      })
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    // The storefront caches for minutes; clear it so a new piece is visible
    // the moment it is saved rather than whenever the window happens to lapse.
    if (data?.id) {
      /*
        The axes come from the category, never from the request: they decide
        which slugs are real, and a browser must not be able to invent one.
      */
      const axes = await getVariantAxes(
        (data as { category_id?: string | null }).category_id ?? null,
      );

      // The axes are answered by the grid below, so they are held back from
      // the descriptor save rather than being deleted as cleared.
      await saveProductAttributeValues(
        data.id,
        body.attributeValues ?? {},
        axes.map((a) => a.id),
      );

      const drafts = parseVariantDrafts(body);
      const details = parseOptionDetails(body);
      if (drafts) await saveProductVariants(data.id, drafts, axes);
      if (details) await saveOptionDetails(data.id, details, axes);
    }

    revalidateCatalogue({
      productId: data?.id,
      categorySlug: (data as { categories?: { slug?: string } })?.categories?.slug,
    });

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
