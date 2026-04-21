import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserContext } from '@/types/user-context';

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(`profile not found for user ${userId}`);
  }

  switch (profile.role) {
    case 'athlete':
      return buildAthleteContext(supabase, userId);
    case 'brand':
      return buildBrandContext(supabase, userId);
    case 'athletic_director':
      return buildDirectorContext(supabase, userId);
    case 'state_ad':
      return buildStateAdContext(supabase, userId);
    case 'hs_parent':
      return buildParentContext(supabase, userId);
    case 'admin':
      return { role: 'admin', userId };
    default:
      throw new Error(`unknown role: ${profile.role}`);
  }
}

async function buildAthleteContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  // HS first — if a row exists here, user is an HS athlete.
  // hs_athlete_profiles.user_id is the FK directly to auth.users(id)
  const { data: hs } = await supabase
    .from('hs_athlete_profiles')
    .select('id, school_name, sport, gpa, graduation_year')
    .eq('user_id', userId)
    .maybeSingle();

  if (hs) {
    return {
      role: 'athlete',
      level: 'hs',
      userId,
      athlete: {
        id: hs.id,
        firstName: '', // hs_athlete_profiles doesn't split name; consider extending later
        lastName: '',
        schoolName: hs.school_name,
        sport: hs.sport,
        gpa: hs.gpa,
        gradYear: hs.graduation_year,
      },
    };
  }

  const { data: college } = await supabase
    .from('athletes')
    .select('id, first_name, last_name, sport_id, gpa, expected_graduation, school_id, schools(name)')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!college) {
    throw new Error(`athlete profile missing for ${userId}`);
  }

  return {
    role: 'athlete',
    level: 'college',
    userId,
    athlete: {
      id: college.id,
      firstName: college.first_name,
      lastName: college.last_name,
      schoolName: (college.schools as unknown as { name: string } | null)?.name ?? null,
      sport: null, // join sports if needed later
      gpa: college.gpa,
      gradYear: college.expected_graduation ? parseInt(college.expected_graduation, 10) : null,
    },
  };
}

async function buildBrandContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: brand } = await supabase
    .from('brands')
    .select('id, company_name')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!brand) throw new Error(`brand profile missing for ${userId}`);

  // Derive targetsLevels from campaign presence.
  const { count: hsCount } = await supabase
    .from('hs_brand_campaigns')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brand.id);

  const targetsLevels: Array<'college' | 'hs'> = ['college'];
  if ((hsCount ?? 0) > 0) targetsLevels.push('hs');

  return {
    role: 'brand',
    userId,
    brand: {
      id: brand.id,
      companyName: brand.company_name,
      targetsLevels,
    },
  };
}

async function buildDirectorContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: director } = await supabase
    .from('athletic_directors')
    .select('id, school_id, title, department')
    .eq('profile_id', userId)
    .maybeSingle();

  if (!director) throw new Error(`director profile missing for ${userId}`);

  return {
    role: 'athletic_director',
    scope: 'school',
    userId,
    director: {
      id: director.id,
      schoolId: director.school_id,
      title: director.title,
      department: director.department,
    },
  };
}

async function buildStateAdContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  const { data: assignment } = await supabase
    .from('state_ad_assignments')
    .select('id, state_code, organization_name')
    .eq('user_id', userId)
    .is('deactivated_at', null)
    .maybeSingle();

  if (!assignment) throw new Error(`state_ad assignment missing for ${userId}`);

  return {
    role: 'state_ad',
    scope: 'state',
    userId,
    director: {
      assignmentId: assignment.id,
      stateCode: assignment.state_code,
      organizationName: assignment.organization_name,
    },
  };
}

async function buildParentContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserContext> {
  // Schema deviation from plan:
  // hs_parent_athlete_links uses parent_profile_id (FK → hs_parent_profiles.id)
  // and athlete_user_id (not athlete_id). We must first resolve the parent's
  // profile id, then query the link table.
  const { data: parentProfile } = await supabase
    .from('hs_parent_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!parentProfile) {
    // No profile yet — return context with empty athleteIds
    return {
      role: 'hs_parent',
      userId,
      parent: {
        id: userId,
        athleteIds: [],
      },
    };
  }

  const { data: links } = await supabase
    .from('hs_parent_athlete_links')
    .select('athlete_user_id')
    .eq('parent_profile_id', parentProfile.id);

  return {
    role: 'hs_parent',
    userId,
    parent: {
      id: userId,
      athleteIds: ((links ?? []) as Array<{ athlete_user_id: string }>).map(
        (l) => l.athlete_user_id
      ),
    },
  };
}
