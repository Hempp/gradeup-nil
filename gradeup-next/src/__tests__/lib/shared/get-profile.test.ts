import { getProfile } from '@/lib/shared/get-profile';
import { makeSupabaseMock } from '@/__tests__/helpers/supabase-mock';

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
});
