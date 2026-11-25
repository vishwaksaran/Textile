import { NextResponse } from 'next/server';
import { getCategories } from '@/lib/data';

export const revalidate = 3600;

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json({ categories });
}
