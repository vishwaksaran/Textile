import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { revalidateCatalogue } from '@/lib/revalidate';
import { saveProductAttributeValues } from '@/lib/attributes';
import { parseVariantDrafts, saveProductVariants } from '@/lib/variants';
import { errorResponse, validateProduct } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SELECT = '*, categories:category_id (id, name, slug)';


export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const { data, error } = await supabase
      .from('products')
      .select(SELECT)
      .eq('id', params.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    return NextResponse.json({ product: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();
    const body = await request.json();

    const validation = validateProduct(body);
    if (validation) return NextResponse.json({ error: validation }, { status: 400 });

    const stock = Number(body.stock_quantity ?? 0);
    const { data, error } = await supabase
      .from('products')
      .update({
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
        // Kept in step with stock so the storefront badge is never stale.
        is_sold_out: stock <= 0,
        is_active: body.is_active !== false,
      })
      .eq('id', params.id)
      .select(SELECT)
      .single();

    if (error) throw new Error(error.message);
    if (data?.id) {
      await saveProductAttributeValues(data.id, body.attributeValues ?? {});
      /*
        After the product update, and deliberately so: saving sizes fires the
        trigger that writes stock_quantity back, and doing it first would let
        the product update overwrite the sum with the figure the form was
        showing.
      */
      const drafts = parseVariantDrafts(body);
      if (drafts) await saveProductVariants(data.id, drafts);
    }

    revalidateCatalogue({
      productId: params.id,
      categorySlug: (data as { categories?: { slug?: string } })?.categories?.slug,
    });

    return NextResponse.json({ product: data });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();

    // Products referenced by past orders are retired rather than deleted, so
    // order history keeps its item names.
    const { count } = await supabase
      .from('order_items')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', params.id);

    if ((count ?? 0) > 0) {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', params.id);
      if (error) throw new Error(error.message);
      revalidateCatalogue({ productId: params.id });
      return NextResponse.json({ deleted: false, deactivated: true });
    }

    // Attribute values go with the row: the foreign key cascades.
    const { error } = await supabase.from('products').delete().eq('id', params.id);
    if (error) throw new Error(error.message);
    revalidateCatalogue({ productId: params.id });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return errorResponse(err);
  }
}
