import { getProfile } from '@/lib/shared/get-profile';
import { makeSupabaseMock } from '@/test-utils/supabase-mock';

describe('getProfile', () => {
  it('returns athlete (college) when athletes row exists and hs_athlete_profiles does not', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-1': { id: 'user-1', role: 'athlete' },
      // No hs_athlete_profiles:user-1 row → falls through to college path
      'athletes:user-1': {
        id: 'a1',
        first_name: 'Sam',
        last_name: 'Lee',
        sport_id: null,
        gpa: 3.5,
        expected_graduation: '2026',
        school_id: 'school-1',
        schools: { name: 'State U' },
      },
    });
    const ctx = await getProfile(supabase as never, 'user-1');
    expect(ctx).toMatchObject({ role: 'athlete', level: 'college' });
  });

  it('returns athlete (hs) when hs_athlete_profiles row exists', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-2': { id: 'user-2', role: 'athlete' },
      'hs_athlete_profiles:user-2': {
        id: 'h1',
        school_name: 'Central HS',
        sport: 'Basketball',
        gpa: 3.8,
        graduation_year: 2027,
      },
    });
    const ctx = await getProfile(supabase as never, 'user-2');
    expect(ctx).toMatchObject({ role: 'athlete', level: 'hs' });
  });

  it('returns state_ad with scope=state when state_ad_assignments row exists', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-3': { id: 'user-3', role: 'state_ad' },
      'state_ad_assignments:user-3': {
        id: 's1',
        state_code: 'TX',
        organization_name: 'UIL',
        deactivated_at: null,
      },
    });
    const ctx = await getProfile(supabase as never, 'user-3');
    expect(ctx).toMatchObject({
      role: 'state_ad',
      scope: 'state',
      director: { stateCode: 'TX' },
    });
  });

  it('throws when profiles row is missing', async () => {
    const supabase = makeSupabaseMock({});
    await expect(getProfile(supabase as never, 'user-404')).rejects.toThrow(
      /profile not found/i
    );
  });

  it('returns brand with targetsLevels=[college] when brand has no HS campaigns', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-b1': { role: 'brand' },
      'brands:user-b1': { id: 'b1', company_name: 'Acme Co' },
      // intentionally no hs_brand_campaigns rows for b1
    });
    const ctx = await getProfile(supabase as never, 'user-b1');
    expect(ctx).toMatchObject({
      role: 'brand',
      brand: {
        id: 'b1',
        companyName: 'Acme Co',
        targetsLevels: ['college'],
      },
    });
  });

  it('returns brand with targetsLevels=[college,hs] when brand has HS campaigns', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-b2': { role: 'brand' },
      'brands:user-b2': { id: 'b2', company_name: 'Widget Co' },
      'hs_brand_campaigns:b2': [{ id: 'c1' }, { id: 'c2' }], // 2 HS campaigns
    });
    const ctx = await getProfile(supabase as never, 'user-b2');
    expect(ctx).toMatchObject({
      role: 'brand',
      brand: {
        id: 'b2',
        companyName: 'Widget Co',
        targetsLevels: ['college', 'hs'],
      },
    });
  });

  it('returns admin context with only role and userId', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-admin': { role: 'admin' },
    });
    const ctx = await getProfile(supabase as never, 'user-admin');
    expect(ctx).toEqual({ role: 'admin', userId: 'user-admin' });
  });

  it('returns athletic_director with scope=school', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-ad': { role: 'athletic_director' },
      'athletic_directors:user-ad': { id: 'ad1', school_id: 'sch1', title: 'AD', department: 'Athletics' },
    });
    const ctx = await getProfile(supabase as never, 'user-ad');
    expect(ctx).toMatchObject({
      role: 'athletic_director',
      scope: 'school',
      director: { id: 'ad1', schoolId: 'sch1' },
    });
  });

  it('returns hs_parent with empty athleteIds when no parent_profile or links exist', async () => {
    const supabase = makeSupabaseMock({
      'profiles:user-p1': { role: 'hs_parent' },
      // no hs_parent_profiles row → two-step lookup returns empty
    });
    const ctx = await getProfile(supabase as never, 'user-p1');
    expect(ctx).toMatchObject({
      role: 'hs_parent',
      userId: 'user-p1',
      parent: { id: 'user-p1', athleteIds: [] },
    });
  });
});
