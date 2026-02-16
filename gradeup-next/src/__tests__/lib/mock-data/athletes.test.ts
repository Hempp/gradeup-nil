/**
 * Tests for the athletes mock data module
 * @module __tests__/lib/mock-data/athletes.test
 */

import {
  MOCK_ATHLETES,
  MOCK_ATHLETE_PROFILES,
  getMockAthleteById,
  getMockAthleteProfile,
  getMockSports,
  getMockSchools,
  SPORTS,
  SCHOOLS,
  type MockAthlete,
  type MockAthleteProfile,
} from '@/lib/mock-data/athletes';

describe('athletes mock data', () => {
  describe('MOCK_ATHLETES', () => {
    it('contains athletes', () => {
      expect(MOCK_ATHLETES.length).toBeGreaterThan(0);
    });

    it('each athlete has required fields', () => {
      MOCK_ATHLETES.forEach((athlete: MockAthlete) => {
        expect(athlete.id).toBeDefined();
        expect(athlete.name).toBeDefined();
        expect(athlete.school).toBeDefined();
        expect(athlete.sport).toBeDefined();
        expect(athlete.position).toBeDefined();
        expect(typeof athlete.gpa).toBe('number');
        expect(typeof athlete.instagramFollowers).toBe('number');
        expect(typeof athlete.tiktokFollowers).toBe('number');
        expect(typeof athlete.engagementRate).toBe('number');
        expect(typeof athlete.nilValue).toBe('number');
        expect(typeof athlete.verified).toBe('boolean');
      });
    });

    it('athletes have valid GPA values (0-4.0 scale)', () => {
      MOCK_ATHLETES.forEach((athlete) => {
        expect(athlete.gpa).toBeGreaterThanOrEqual(0);
        expect(athlete.gpa).toBeLessThanOrEqual(4.0);
      });
    });

    it('athletes have positive follower counts', () => {
      MOCK_ATHLETES.forEach((athlete) => {
        expect(athlete.instagramFollowers).toBeGreaterThan(0);
        expect(athlete.tiktokFollowers).toBeGreaterThan(0);
      });
    });

    it('athletes have positive NIL values', () => {
      MOCK_ATHLETES.forEach((athlete) => {
        expect(athlete.nilValue).toBeGreaterThan(0);
      });
    });

    it('engagement rates are reasonable percentages', () => {
      MOCK_ATHLETES.forEach((athlete) => {
        expect(athlete.engagementRate).toBeGreaterThan(0);
        expect(athlete.engagementRate).toBeLessThanOrEqual(20);
      });
    });

    it('some athletes have highlight URLs', () => {
      const athletesWithHighlights = MOCK_ATHLETES.filter(
        (a) => a.highlightUrls && a.highlightUrls.length > 0
      );
      expect(athletesWithHighlights.length).toBeGreaterThan(0);
    });
  });

  describe('MOCK_ATHLETE_PROFILES', () => {
    it('contains profiles', () => {
      expect(Object.keys(MOCK_ATHLETE_PROFILES).length).toBeGreaterThan(0);
    });

    it('each profile has extended fields', () => {
      Object.values(MOCK_ATHLETE_PROFILES).forEach((profile: MockAthleteProfile) => {
        expect(profile.firstName).toBeDefined();
        expect(profile.lastName).toBeDefined();
        expect(profile.schoolDetails).toBeDefined();
        expect(typeof profile.enrollmentVerified).toBe('boolean');
        expect(typeof profile.sportVerified).toBe('boolean');
        expect(typeof profile.gradesVerified).toBe('boolean');
        expect(typeof profile.identityVerified).toBe('boolean');
        expect(typeof profile.nilValuation).toBe('number');
        expect(typeof profile.completedDeals).toBe('number');
        expect(typeof profile.totalEarnings).toBe('number');
      });
    });

    it('school details have required fields', () => {
      Object.values(MOCK_ATHLETE_PROFILES).forEach((profile) => {
        if (profile.schoolDetails) {
          expect(profile.schoolDetails.name).toBeDefined();
          expect(profile.schoolDetails.city).toBeDefined();
          expect(profile.schoolDetails.state).toBeDefined();
          expect(profile.schoolDetails.division).toBeDefined();
          expect(profile.schoolDetails.conference).toBeDefined();
        }
      });
    });

    it('profile IDs match athlete IDs in MOCK_ATHLETES', () => {
      Object.keys(MOCK_ATHLETE_PROFILES).forEach((profileId) => {
        const matchingAthlete = MOCK_ATHLETES.find((a) => a.id === profileId);
        expect(matchingAthlete).toBeDefined();
      });
    });
  });

  describe('getMockAthleteById', () => {
    it('returns an athlete for valid ID', () => {
      const athlete = getMockAthleteById('1');
      expect(athlete).toBeDefined();
      expect(athlete?.id).toBe('1');
    });

    it('returns undefined for invalid ID', () => {
      const athlete = getMockAthleteById('invalid-id-999');
      expect(athlete).toBeUndefined();
    });

    it('returns undefined for empty ID', () => {
      const athlete = getMockAthleteById('');
      expect(athlete).toBeUndefined();
    });
  });

  describe('getMockAthleteProfile', () => {
    it('returns a profile for valid ID', () => {
      const profile = getMockAthleteProfile('1');
      expect(profile).toBeDefined();
      expect(profile?.firstName).toBeDefined();
      expect(profile?.lastName).toBeDefined();
    });

    it('returns undefined for invalid ID', () => {
      const profile = getMockAthleteProfile('invalid-id-999');
      expect(profile).toBeUndefined();
    });

    it('profile contains base athlete data plus extended fields', () => {
      const profile = getMockAthleteProfile('1');
      expect(profile?.id).toBe('1');
      expect(profile?.name).toBeDefined();
      expect(profile?.school).toBeDefined();
      expect(profile?.firstName).toBeDefined();
      expect(profile?.schoolDetails).toBeDefined();
      expect(profile?.nilValuation).toBeDefined();
    });
  });

  describe('getMockSports', () => {
    it('returns an array of sports', () => {
      const sports = getMockSports();
      expect(Array.isArray(sports)).toBe(true);
      expect(sports.length).toBeGreaterThan(0);
    });

    it('returns unique sports', () => {
      const sports = getMockSports();
      const uniqueSports = [...new Set(sports)];
      expect(sports.length).toBe(uniqueSports.length);
    });

    it('sports are sorted alphabetically', () => {
      const sports = getMockSports();
      const sortedSports = [...sports].sort();
      expect(sports).toEqual(sortedSports);
    });
  });

  describe('getMockSchools', () => {
    it('returns an array of schools', () => {
      const schools = getMockSchools();
      expect(Array.isArray(schools)).toBe(true);
      expect(schools.length).toBeGreaterThan(0);
    });

    it('returns unique schools', () => {
      const schools = getMockSchools();
      const uniqueSchools = [...new Set(schools)];
      expect(schools.length).toBe(uniqueSchools.length);
    });

    it('schools are sorted alphabetically', () => {
      const schools = getMockSchools();
      const sortedSchools = [...schools].sort();
      expect(schools).toEqual(sortedSchools);
    });
  });

  describe('static exports', () => {
    it('SPORTS matches getMockSports result', () => {
      expect(SPORTS).toEqual(getMockSports());
    });

    it('SCHOOLS matches getMockSchools result', () => {
      expect(SCHOOLS).toEqual(getMockSchools());
    });
  });

  describe('data consistency', () => {
    it('all athletes have unique IDs', () => {
      const ids = MOCK_ATHLETES.map((a) => a.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it('profile data extends base athlete data correctly', () => {
      Object.entries(MOCK_ATHLETE_PROFILES).forEach(([id, profile]) => {
        const baseAthlete = getMockAthleteById(id);
        expect(baseAthlete).toBeDefined();
        if (baseAthlete) {
          expect(profile.id).toBe(baseAthlete.id);
          expect(profile.name).toBe(baseAthlete.name);
          expect(profile.school).toBe(baseAthlete.school);
          expect(profile.sport).toBe(baseAthlete.sport);
        }
      });
    });
  });
});
