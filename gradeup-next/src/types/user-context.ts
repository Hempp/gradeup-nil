// src/types/user-context.ts
export type AthleteLevel = 'college' | 'hs';
export type DirectorScope = 'school' | 'state';

export type UserContext =
  | { role: 'athlete'; level: AthleteLevel; userId: string; athlete: AthleteContext }
  | { role: 'brand'; userId: string; brand: BrandContext }
  | { role: 'athletic_director'; scope: 'school'; userId: string; director: DirectorContext }
  | { role: 'state_ad'; scope: 'state'; userId: string; director: StateDirectorContext }
  | { role: 'hs_parent'; userId: string; parent: ParentContext }
  | { role: 'admin'; userId: string };

export interface AthleteContext {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
  sport: string | null;
  gpa: number | null;
  gradYear: number | null;
}

export interface BrandContext {
  id: string;
  companyName: string;
  /** Which levels this brand actively targets. Derived, not stored:
   *  'college' if any non-HS campaigns exist; 'hs' if any `hs_brand_campaigns` row exists;
   *  both possible. */
  targetsLevels: AthleteLevel[];
}

export interface DirectorContext {
  id: string;
  schoolId: string | null;
  title: string | null;
  department: string | null;
}

export interface StateDirectorContext {
  assignmentId: string;
  stateCode: string;
  organizationName: string | null;
}

export interface ParentContext {
  id: string;
  athleteIds: string[];
}
