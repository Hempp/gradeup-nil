import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      athlete_id: _athleteId,
      brand_id: _brandId,
      brand: _brand,
      athlete: _athlete,
      created_at: _createdAt,
      ...updates
    } = body;

    // Add updated_at timestamp
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // Handle status-specific timestamps
    if (updates.status === 'accepted' && !updates.accepted_at) {
      updateData.accepted_at = new Date().toISOString();
    }
    if (updates.status === 'completed' && !updates.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }
    if (updates.status === 'cancelled' && !updates.cancelled_at) {
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

    // First check if deal exists and user has permission
    const { data: existingDeal, error: fetchError } = await supabase
      .from('deals')
      .select('id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existingDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Only allow deletion of draft or cancelled deals
    if (!['draft', 'cancelled', 'rejected'].includes(existingDeal.status)) {
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
