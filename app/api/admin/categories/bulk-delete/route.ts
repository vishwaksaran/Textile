import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deleteCategorySubtree, errorResponse } from '@/lib/admin-api';
import { revalidateCatalogue } from '@/lib/revalidate';

export const dynamic = 'force-dynamic';

/** Deletes several collections and their subtrees. See deleteCategorySubtree. */
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

    const result = await deleteCategorySubtree(ids);
    if ('error' in result) return NextResponse.json(result, { status: 409 });

    revalidateCatalogue();

    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
