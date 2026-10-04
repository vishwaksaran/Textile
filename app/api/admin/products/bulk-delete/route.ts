import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deleteProducts, errorResponse } from '@/lib/admin-api';
import { revalidateCatalogue } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

/** One accidental click should not be able to empty a catalogue. */
const MAX = 100;

/**
 * Deletes several pieces at once, by the same rule the single delete uses:
 * every one is removed, including pieces that appear in past orders — their
 * order lines keep their own copy of the name, so invoices are unaffected.
 * A piece the shop wants off the storefront but kept is hidden instead,
 * through the separate visibility action.
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
      return NextResponse.json(
        { error: `Select ${MAX} or fewer at a time.` },
        { status: 400 },
      );
    }

    const deleted = await deleteProducts(ids);
    revalidateCatalogue();

    return NextResponse.json({ deleted });
  } catch (err) {
    return errorResponse(err);
  }
}
