import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDealSchema, validateInput, formatValidationError } from '@/lib/validations';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateDealCreation } from '@/lib/hs-nil/deal-validation';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('page_size') || '10', 10), 100);
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

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateInput(createDealSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Authorization: verify the authenticated user owns the brand creating the deal
    const { data: brand } = await supabase
      .from('brands')
      .select('id, user_id')
      .eq('id', validatedData.brand_id)
      .single();

    if (!brand || brand.user_id !== user.id) {
      // Also check if user is the athlete (athletes can accept deals proposed to them)
      const { data: athlete } = await supabase
        .from('athletes')
        .select('id, user_id')
        .eq('id', validatedData.athlete_id)
        .single();

      if (!athlete || athlete.user_id !== user.id) {
        return NextResponse.json(
          { error: 'You are not authorized to create deals for this brand or athlete' },
          { status: 403 }
        );
      }
    }

    // HS-NIL gate. Non-college target bracket → route through the state-rule
    // evaluator before writing the row. College deals skip this entirely so
    // we don't disturb existing flows.
    //
    // MODEL-EXTENDER is adding target_bracket/state_code/requires_disclosure
    // columns to `deals` and a `bracket` column to `athletes`. Locally the
    // migration may not be applied yet; the typed select below is intentionally
    // tolerant of missing columns — Supabase returns `undefined` for unknown
    // column names at runtime, which we handle as "college" (the safe default).
    const rawTargetBracket = (body as { target_bracket?: string }).target_bracket;
    let hsFields: { target_bracket?: string; state_code?: string | null; requires_disclosure?: boolean } = {};

    if (rawTargetBracket && rawTargetBracket !== 'college') {
      const { data: athleteRow } = await supabase
        .from('athletes')
        .select('id, profile_id, bracket')
        .eq('id', validatedData.athlete_id)
        .maybeSingle();

      if (!athleteRow) {
        return NextResponse.json(
          { error: 'Athlete not found' },
          { status: 404 }
        );
      }

      const result = await validateDealCreation({
        deal: {
          target_bracket: rawTargetBracket,
          deal_type: validatedData.deal_type,
          compensation_amount: validatedData.compensation_amount,
          start_date: validatedData.start_date ?? null,
          end_date: validatedData.end_date ?? null,
          tags: (body as { tags?: string[] }).tags ?? null,
          involves_school_ip: (body as { involves_school_ip?: boolean })
            .involves_school_ip,
          is_contingent_on_performance: (body as { is_contingent_on_performance?: boolean })
            .is_contingent_on_performance,
        },
        athlete: {
          user_id: (athleteRow as { profile_id: string }).profile_id,
          bracket: (athleteRow as { bracket?: string | null }).bracket ?? null,
        },
        supabase,
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            error: result.code,
            violations: result.violations,
          },
          { status: 422 }
        );
      }

      hsFields = {
        target_bracket: rawTargetBracket,
        state_code: result.state_code,
        requires_disclosure: result.requires_disclosure,
      };
    } else if (rawTargetBracket === 'college') {
      hsFields = { target_bracket: 'college' };
    }

    const { data: deal, error } = await supabase
      .from('deals')
      .insert({
        athlete_id: validatedData.athlete_id,
        brand_id: validatedData.brand_id,
        opportunity_id: validatedData.opportunity_id,
        title: validatedData.title,
        description: validatedData.description,
        deal_type: validatedData.deal_type,
        compensation_amount: validatedData.compensation_amount,
        compensation_type: validatedData.compensation_type,
        start_date: validatedData.start_date,
        end_date: validatedData.end_date,
        deliverables: validatedData.deliverables,
        status: 'pending',
        ...hsFields,
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
