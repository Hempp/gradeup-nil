/**
 * GET /api/hs/brand/public-profile/check-slug?slug=foo
 *
 * Live availability check for the slug-claim field.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { checkSlugAvailable } from '@/lib/hs-nil/brand-directory';

export async function GET(request: NextRequest) {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const slug = request.nextUrl.searchParams.get('slug') ?? '';
  if (!slug) {
    return NextResponse.json({ available: false, reason: 'invalid_slug' });
  }

  const result = await checkSlugAvailable(slug);
  return NextResponse.json(result);
}
