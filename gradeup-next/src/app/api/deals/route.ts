import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    const statuses = searchParams.get('status')?.split(',').filter(Boolean);
    const dealTypes = searchParams.get('deal_type')?.split(',').filter(Boolean);
    const athleteId = searchParams.get('athlete_id');
    const brandId = searchParams.get('brand_id');

    let query = supabase
      .from('deals')
      .select(`
        *,
        brand:brands(id, company_name, logo_url),
        athlete:athletes(
          id,
          profile:profiles(first_name, last_name, avatar_url)
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (athleteId) {
      query = query.eq('athlete_id', athleteId);
    }

    if (brandId) {
      query = query.eq('brand_id', brandId);
    }

    if (statuses && statuses.length > 0) {
      query = query.in('status', statuses);
    }

    if (dealTypes && dealTypes.length > 0) {
      query = query.in('deal_type', dealTypes);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      deals: data,
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

    const body = await request.json();

    if (!body.athlete_id || !body.brand_id || !body.title || !body.deal_type || body.compensation_amount === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: athlete_id, brand_id, title, deal_type, compensation_amount' },
        { status: 400 }
      );
    }

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        athlete_id: body.athlete_id,
        brand_id: body.brand_id,
        opportunity_id: body.opportunity_id,
        title: body.title,
        description: body.description,
        deal_type: body.deal_type,
        compensation_amount: body.compensation_amount,
        compensation_type: body.compensation_type || 'fixed',
        start_date: body.start_date,
        end_date: body.end_date,
        deliverables: body.deliverables,
        status: 'pending',
      })
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(deal, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
