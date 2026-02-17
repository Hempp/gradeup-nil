import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateDealSchema, validateInput, formatValidationError } from '@/lib/validations';

/**
 * Verify that the authenticated user is either the athlete or brand owner on a deal
 * Returns the deal data if authorized, null otherwise
 */
async function verifyDealOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  dealId: string,
  userId: string
): Promise<{ authorized: boolean; deal: { id: string; status: string; athlete_id: string; brand_id: string } | null; role: 'athlete' | 'brand' | null }> {
  // Fetch the deal with athlete and brand profile IDs
  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      id,
      status,
      athlete_id,
      brand_id,
      athlete:athletes!inner(profile_id),
      brand:brands!inner(profile_id)
    `)
    .eq('id', dealId)
    .single();

  if (error || !deal) {
    return { authorized: false, deal: null, role: null };
  }

  // Check if user is the athlete on this deal
  const athleteData = deal.athlete as unknown as { profile_id: string };
  const brandData = deal.brand as unknown as { profile_id: string };

  if (athleteData.profile_id === userId) {
    return {
      authorized: true,
      deal: { id: deal.id, status: deal.status, athlete_id: deal.athlete_id, brand_id: deal.brand_id },
      role: 'athlete'
    };
  }

  // Check if user is the brand on this deal
  if (brandData.profile_id === userId) {
    return {
      authorized: true,
      deal: { id: deal.id, status: deal.status, athlete_id: deal.athlete_id, brand_id: deal.brand_id },
      role: 'brand'
    };
  }

  return { authorized: false, deal: null, role: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: deal, error } = await supabase
      .from('deals')
      .select(`
        *,
        brand:brands(id, company_name, logo_url, contact_name, contact_email),
        athlete:athletes(
          id,
          profile:profiles(first_name, last_name, avatar_url, bio),
          school:schools(*),
          sport:sports(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(deal);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is either the athlete or brand on this deal
    const ownership = await verifyDealOwnership(supabase, id, user.id);
    if (!ownership.authorized) {
      return NextResponse.json(
        { error: 'You do not have permission to modify this deal' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      athlete_id: _athleteId,
      brand_id: _brandId,
      brand: _brand,
      athlete: _athlete,
      created_at: _createdAt,
      ...rawUpdates
    } = body;

    // Validate input with Zod schema
    const validation = validateInput(updateDealSchema, rawUpdates);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Add updated_at timestamp
    const updateData: Record<string, unknown> = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Handle status-specific timestamps
    if (updates.status === 'accepted' && !body.accepted_at) {
      updateData.accepted_at = new Date().toISOString();
    }
    if (updates.status === 'completed' && !body.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    if (updates.status === 'cancelled' && !body.cancelled_at) {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data: deal, error } = await supabase
      .from('deals')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        brand:brands(id, company_name, logo_url),
        athlete:athletes(
          id,
          profile:profiles(first_name, last_name, avatar_url)
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(deal);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is either the athlete or brand on this deal
    const ownership = await verifyDealOwnership(supabase, id, user.id);
    if (!ownership.authorized || !ownership.deal) {
      return NextResponse.json(
        { error: 'Deal not found or you do not have permission to delete it' },
        { status: 403 }
      );
    }

    // Only allow deletion of draft or cancelled deals
    if (!['draft', 'cancelled', 'rejected'].includes(ownership.deal.status)) {
      return NextResponse.json(
        { error: 'Cannot delete an active deal. Cancel it first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
