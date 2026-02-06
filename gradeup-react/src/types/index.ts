// Types for GradeUp NIL Platform

export interface StatsTaqData {
  pointsPerGame: number;
  assistsPerGame: number;
  reboundsPerGame: number;
  fieldGoalPercentage: number;
  gamesPlayed: number;
  minutesPerGame: number;
  seasonHighPoints: number;
  doubleDoubles: number;
  tripleDoubles: number;
  playerEfficiencyRating: number;
}

export interface Athlete {
  id: string;
  name: string;
  sport: string;
  position: string;
  university: string;
  gpa: number;
  major: string;
  year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';
  photo: string;
  socialMedia: {
    instagram: number;
    twitter: number;
    tiktok: number;
  };
  nilValue: number;
  verified: boolean;
  statsTaq: StatsTaqData;
  bio: string;
  achievements: string[];
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  industry: string;
  budget: number;
  activeDeals: number;
}

export interface SmartContractTask {
  id: string;
  description: string;
  deadline: string;
  payment: number;
  status: 'pending' | 'in_progress' | 'completed' | 'verified';
  proof?: string;
}

export interface SmartContract {
  id: string;
  athleteId: string;
  brandId: string;
  athleteName: string;
  brandName: string;
  title: string;
  description: string;
  totalValue: number;
  tasks: SmartContractTask[];
  status: 'draft' | 'pending_signature' | 'active' | 'completed' | 'disputed';
  createdAt: string;
  startDate: string;
  endDate: string;
  signatures: {
    athlete: boolean;
    brand: boolean;
  };
}

export interface Deal {
  id: string;
  brandName: string;
  brandLogo: string;
  title: string;
  value: number;
  status: 'pending' | 'active' | 'completed';
  tasks: SmartContractTask[];
}

export type DashboardType = 'director' | 'athlete' | 'brand';
export type ViewType = 'landing' | 'dashboard';
