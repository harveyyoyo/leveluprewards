import { NextResponse } from 'next/server';
import { searchBooksByTitle } from '@/lib/library/libraryCatalogLookup';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get('title') ?? '').trim();
  if (title.length < 2) {
    return NextResponse.json({ hits: [] });
  }

  const hits = await searchBooksByTitle(title, 8);
  return NextResponse.json({ hits });
}
