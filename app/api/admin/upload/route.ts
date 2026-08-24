import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAdmin } from '@/lib/auth';
import { errorResponse } from '@/lib/admin-api';
import { requireAdminSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const BUCKETS = ['products', 'categories'] as const;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/** Multipart image upload straight into a public Supabase Storage bucket. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const supabase = requireAdminSupabase();

    const form = await request.formData();
    const file = form.get('file');
    const bucket = String(form.get('bucket') ?? 'products');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
    }
    if (!BUCKETS.includes(bucket as (typeof BUCKETS)[number])) {
      return NextResponse.json({ error: 'Unknown bucket.' }, { status: 400 });
    }
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: 'Images must be JPEG, PNG, WebP or AVIF.' },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Images must be under 5 MB.' }, { status: 400 });
    }

    const extension = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `${new Date().getFullYear()}/${randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, await file.arrayBuffer(), {
        contentType: file.type,
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl, path });
  } catch (err) {
    return errorResponse(err);
  }
}
