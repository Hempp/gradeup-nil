import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('page_size') || '10', 10);
    const offset = (page - 1) * pageSize;

    const sportIds = searchParams.get('sport_ids')?.split(',').filter(Boolean);
    const schoolIds = searchParams.get('school_ids')?.split(',').filter(Boolean);
    const minGpa = searchParams.get('min_gpa') ? parseFloat(searchParams.get('min_gpa')!) : undefined;
    const search = searchParams.get('search');

    let query = supabase
      .from('athletes')
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url, bio),
        school:schools(*),
        sport:sports(*)
      `, { count: 'exact' })
      .eq('is_searchable', true)
      .order('nil_valuation', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    if (sportIds && sportIds.length > 0) {
      query = query.in('sport_id', sportIds);
    }

    if (schoolIds && schoolIds.length > 0) {
      query = query.in('school_id', schoolIds);
    }

    if (minGpa !== undefined) {
      query = query.gte('gpa', minGpa);
    }

    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase()
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      query = query.or(`major.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%,hometown.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      athletes: data,
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

    const { data: athlete, error } = await supabase
      .from('athletes')
      .insert({
        profile_id: user.id,
        school_id: body.school_id,
        sport_id: body.sport_id,
        position: body.position,
        jersey_number: body.jersey_number,
        academic_year: body.academic_year,
        gpa: body.gpa,
        major: body.major,
        hometown: body.hometown,
        height_inches: body.height_inches,
        weight_lbs: body.weight_lbs,
        is_searchable: body.is_searchable ?? true,
      })
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url, bio),
        school:schools(*),
        sport:sports(*)
      `)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(athlete, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
