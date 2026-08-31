import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { getAllAttributes, getCategoryAttributes } from '@/lib/attributes';

export const dynamic = 'force-dynamic';

/**
 * The fields one category asks for.
 *
 * Fetched by the product form when the collection changes, rather than
 * shipping every attribute to the browser and filtering there — a catalogue
 * with a dozen sections would send twelve forms' worth of options to draw one.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const categoryId = new URL(request.url).searchParams.get('categoryId');
    // No category named: the whole list, which is what the Category Manager
    // needs to offer a choice of axes.
    return NextResponse.json({
      attributes: categoryId
        ? await getCategoryAttributes(categoryId)
        : await getAllAttributes(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
