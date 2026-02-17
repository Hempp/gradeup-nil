import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCampaignSchema, validateInput, formatValidationError } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
    const offset = (page - 1) * pageSize;

    const brandId = searchParams.get('brand_id');
    const statuses = searchParams.get('status')?.split(',').filter(Boolean);

    // If no brand_id provided, get the user's brand
    let targetBrandId = brandId;
    if (!targetBrandId) {
      const { data: brand } = await supabase
        .from('brands')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (brand) {
        targetBrandId = brand.id;
      }
    }

    let query = supabase
      .from('campaigns')
      .select(`
        *,
        brand:brands(id, company_name, logo_url)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (targetBrandId) {
      query = query.eq('brand_id', targetBrandId);
    }

    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      campaigns: data,
      pagination: {
        page,
        page_size: pageSize,
        total: count ?? 0,
        total_pages: Math.ceil((count ?? 0) / pageSize),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's brand
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateInput(createCampaignSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        brand_id: brand.id,
        title: validatedData.title,
        description: validatedData.description,
        budget: validatedData.budget,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        status: validatedData.status,
        target_sports: validatedData.target_sports,
        target_divisions: validatedData.target_divisions,
        target_min_gpa: validatedData.target_min_gpa,
        target_min_followers: validatedData.target_min_followers,
      })
      .select(`
        *,
        brand:brands(id, company_name, logo_url)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
