import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAthleteSchema, validateInput, formatValidationError } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // ─── Pagination ───
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('page_size') || '10', 10), 100); // Cap at 100
    const offset = (page - 1) * pageSize;

    // ─── Multi-select Filters ───
    const sportIds = searchParams.get('sport_ids')?.split(',').filter(Boolean);
    const schoolIds = searchParams.get('school_ids')?.split(',').filter(Boolean);
    const divisions = searchParams.get('divisions')?.split(',').filter(Boolean);

    // ─── Range Filters ───
    const minGpa = searchParams.get('min_gpa') ? parseFloat(searchParams.get('min_gpa')!) : undefined;
    const maxGpa = searchParams.get('max_gpa') ? parseFloat(searchParams.get('max_gpa')!) : undefined;
    const minFollowers = searchParams.get('min_followers') ? parseInt(searchParams.get('min_followers')!, 10) : undefined;
    const maxFollowers = searchParams.get('max_followers') ? parseInt(searchParams.get('max_followers')!, 10) : undefined;

    // ─── Boolean Filters ───
    const verifiedOnly = searchParams.get('verified') === 'true';

    // ─── Text Search ───
    const search = searchParams.get('search');

    // ─── Build Query ───
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

    // ─── Apply Sport Filter ───
    if (sportIds && sportIds.length > 0) {
      query = query.in('sport_id', sportIds);
    }

    // ─── Apply School Filter ───
    if (schoolIds && schoolIds.length > 0) {
      query = query.in('school_id', schoolIds);
    }

    // ─── Apply Division Filter ───
    // Note: Division is stored on the school, so we need to filter schools first
    // This requires a subquery or post-filtering. For now, we'll use a workaround
    // by filtering after the fact if division is a direct column on athletes.
    // If division is on schools table, this would need a different approach.
    if (divisions && divisions.length > 0) {
      // Assuming division is accessible via the school relationship
      // This filter will be applied client-side or via a more complex query
      // For direct column on athletes table:
      query = query.in('division', divisions);
    }

    // ─── Apply GPA Range Filter ───
    if (minGpa !== undefined && !isNaN(minGpa)) {
      query = query.gte('gpa', minGpa);
    }
    if (maxGpa !== undefined && !isNaN(maxGpa)) {
      query = query.lte('gpa', maxGpa);
    }

    // ─── Apply Follower Range Filter ───
    if (minFollowers !== undefined && !isNaN(minFollowers)) {
      query = query.gte('total_followers', minFollowers);
    }
    if (maxFollowers !== undefined && !isNaN(maxFollowers)) {
      query = query.lte('total_followers', maxFollowers);
    }

    // ─── Apply Verification Filter ───
    if (verifiedOnly) {
      // Check all verification flags
      query = query
        .eq('enrollment_verified', true)
        .eq('sport_verified', true)
        .eq('grades_verified', true);
    }

    // ─── Apply Text Search ───
    if (search && search.trim()) {
      const searchTerm = search.trim().toLowerCase()
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      // Search across multiple fields
      query = query.or(`major.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%,hometown.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ─── Post-filter for division if it's on the school relationship ───
    let filteredData = data;
    if (divisions && divisions.length > 0 && data) {
      // Filter by school division if division is on schools table
      filteredData = data.filter((athlete) => {
        const schoolDivision = athlete.school?.division;
        return schoolDivision && divisions.includes(schoolDivision);
      });
    }

    return NextResponse.json({
      athletes: filteredData ?? data,
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

    // Validate input with Zod schema
    const validation = validateInput(createAthleteSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const { data: athlete, error } = await supabase
      .from('athletes')
      .insert({
        profile_id: user.id,
        school_id: validatedData.school_id,
        sport_id: validatedData.sport_id,
        position: validatedData.position,
        jersey_number: validatedData.jersey_number,
        academic_year: validatedData.academic_year,
        gpa: validatedData.gpa,
        major: validatedData.major,
        hometown: validatedData.hometown,
        height_inches: validatedData.height_inches,
        weight_lbs: validatedData.weight_lbs,
        is_searchable: validatedData.is_searchable,
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
