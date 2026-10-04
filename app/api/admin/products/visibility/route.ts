import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse, setProductsVisible } from '@/lib/admin-api';
import { revalidateCatalogue } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

const MAX = 100;

/**
 * Hides pieces from the storefront, or shows them again. The reversible
 * alternative to delete: the product, its photos and its stock stay in the
 * admin, ready to go back on sale.
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();

    const ids = Array.isArray(body.ids)
      ? [...new Set((body.ids as unknown[]).map(String).filter(Boolean))]
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Nothing selected.' }, { status: 400 });
    }
    if (ids.length > MAX) {
      return NextResponse.json({ error: `Select ${MAX} or fewer at a time.` }, { status: 400 });
    }
    if (typeof body.visible !== 'boolean') {
      return NextResponse.json({ error: 'Say whether to show or hide.' }, { status: 400 });
    }

    await setProductsVisible(ids, body.visible);
    revalidateCatalogue();

    return NextResponse.json({ updated: ids.length, visible: body.visible });
  } catch (err) {
    return errorResponse(err);
  }
}
