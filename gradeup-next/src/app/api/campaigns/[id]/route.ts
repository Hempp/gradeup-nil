import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateCampaignSchema, validateInput, formatValidationError } from '@/lib/validations';

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

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        brand:brands(id, company_name, logo_url)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get campaign metrics (deals, spent, athletes)
    const { data: deals } = await supabase
      .from('deals')
      .select('id, compensation_amount, athlete_id, status')
      .eq('campaign_id', id);

    const spent = deals
      ?.filter((d) => ['completed', 'active', 'accepted'].includes(d.status))
      .reduce((sum, d) => sum + (d.compensation_amount || 0), 0) ?? 0;

    const uniqueAthletes = new Set(deals?.map((d) => d.athlete_id)).size;

    return NextResponse.json({
      ...campaign,
      metrics: {
        spent,
        athlete_count: uniqueAthletes,
        deal_count: deals?.length ?? 0,
      },
    });
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

    // Get the user's brand to verify ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const {
      id: _id,
      brand_id: _brandId,
      brand: _brand,
      created_at: _createdAt,
      metrics: _metrics,
      ...rawUpdates
    } = body;

    // Validate input with Zod schema
    const validation = validateInput(updateCampaignSchema, rawUpdates);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const updates = validation.data;

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('brand_id', brand.id)
      .select(`
        *,
        brand:brands(id, company_name, logo_url)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Campaign not found or not authorized' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(campaign);
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

    // Get the user's brand to verify ownership
    const { data: brand } = await supabase
      .from('brands')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Check if campaign exists and belongs to user's brand
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('id', id)
      .eq('brand_id', brand.id)
      .single();

    if (fetchError || !existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Only allow deletion of draft campaigns
    if (existingCampaign.status !== 'draft') {
      return NextResponse.json(
        { error: 'Cannot delete an active campaign. Set status to draft first.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('brand_id', brand.id);

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
