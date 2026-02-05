import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';

interface SearchFilters {
  sport_ids?: string[];
  school_ids?: string[];
  divisions?: string[];
  min_gpa?: number;
  max_gpa?: number;
  min_followers?: number;
  max_followers?: number;
  min_gradeup_score?: number;
  academic_years?: string[];
  verified_only?: boolean;
  search_query?: string;
  sort_by?: 'gradeup_score' | 'total_followers' | 'gpa' | 'nil_valuation';
  sort_order?: 'asc' | 'desc';
  page?: number;
  page_size?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createUserClient(authHeader);
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse search filters from URL or body
    let filters: SearchFilters = {};
    if (req.method === 'POST') {
      filters = await req.json();
    } else {
      const url = new URL(req.url);
      filters = {
        sport_ids: url.searchParams.get('sport_ids')?.split(','),
        school_ids: url.searchParams.get('school_ids')?.split(','),
        divisions: url.searchParams.get('divisions')?.split(','),
        min_gpa: url.searchParams.get('min_gpa') ? parseFloat(url.searchParams.get('min_gpa')!) : undefined,
        max_gpa: url.searchParams.get('max_gpa') ? parseFloat(url.searchParams.get('max_gpa')!) : undefined,
        min_followers: url.searchParams.get('min_followers') ? parseInt(url.searchParams.get('min_followers')!) : undefined,
        max_followers: url.searchParams.get('max_followers') ? parseInt(url.searchParams.get('max_followers')!) : undefined,
        min_gradeup_score: url.searchParams.get('min_gradeup_score') ? parseFloat(url.searchParams.get('min_gradeup_score')!) : undefined,
        academic_years: url.searchParams.get('academic_years')?.split(','),
        verified_only: url.searchParams.get('verified_only') === 'true',
        search_query: url.searchParams.get('q') ?? undefined,
        sort_by: (url.searchParams.get('sort_by') as SearchFilters['sort_by']) ?? 'gradeup_score',
        sort_order: (url.searchParams.get('sort_order') as SearchFilters['sort_order']) ?? 'desc',
        page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : 1,
        page_size: url.searchParams.get('page_size') ? parseInt(url.searchParams.get('page_size')!) : 20,
      };
    }

    // Build query
    let query = adminClient
      .from('athletes')
      .select(`
        *,
        profile:profiles!inner(first_name, last_name, avatar_url),
        school:schools(name, short_name, city, state, division, conference, primary_color),
        sport:sports(name, category, gender, icon_name)
      `)
      .eq('is_searchable', true)
      .eq('accepting_deals', true);

    // Apply filters
    if (filters.sport_ids?.length) {
      query = query.in('sport_id', filters.sport_ids);
    }

    if (filters.school_ids?.length) {
      query = query.in('school_id', filters.school_ids);
    }

    if (filters.divisions?.length) {
      query = query.in('school.division', filters.divisions);
    }

    if (filters.min_gpa !== undefined) {
      query = query.gte('gpa', filters.min_gpa);
    }

    if (filters.max_gpa !== undefined) {
      query = query.lte('gpa', filters.max_gpa);
    }

    if (filters.min_followers !== undefined) {
      query = query.gte('total_followers', filters.min_followers);
    }

    if (filters.max_followers !== undefined) {
      query = query.lte('total_followers', filters.max_followers);
    }

    if (filters.min_gradeup_score !== undefined) {
      query = query.gte('gradeup_score', filters.min_gradeup_score);
    }

    if (filters.academic_years?.length) {
      query = query.in('academic_year', filters.academic_years);
    }

    if (filters.verified_only) {
      query = query
        .eq('enrollment_verified', true)
        .eq('sport_verified', true)
        .eq('grades_verified', true);
    }

    // Sort
    const sortBy = filters.sort_by || 'gradeup_score';
    const sortOrder = filters.sort_order === 'asc' ? true : false;
    query = query.order(sortBy, { ascending: sortOrder });

    // Pagination
    const page = filters.page || 1;
    const pageSize = Math.min(filters.page_size || 20, 100); // Max 100 per page
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data: athletes, error: searchError, count } = await query;

    if (searchError) {
      throw searchError;
    }

    // Log search for analytics
    await adminClient.from('search_analytics').insert({
      user_id: user.id,
      search_query: filters.search_query,
      filters: filters,
      results_count: athletes?.length || 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        athletes,
        pagination: {
          page,
          page_size: pageSize,
          total: count,
          total_pages: count ? Math.ceil(count / pageSize) : 0,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
