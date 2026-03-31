'use client';

import { createClient } from '@/lib/supabase/client';
import type { AthleteStats, StatHighlight, StatsTaqProfile } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// STATSTAQ INTEGRATION SERVICE
// Fetches athletic performance data from StatsTaq API or local database.
// Falls back to mock data when StatsTaq API is not configured.
// ═══════════════════════════════════════════════════════════════════════════

const STATSTAQ_API_URL = process.env.NEXT_PUBLIC_STATSTAQ_API_URL;
const STATSTAQ_API_KEY = process.env.STATSTAQ_API_KEY;

interface ServiceResult<T> {
  data: T | null;
  error: Error | null;
}

// ─── API Integration ───────────────────────────────────────────────────────

/**
 * Fetch athlete stats from StatsTaq external API
 * When the API is available, this makes the real call.
 * Falls back to local database or mock data otherwise.
 */
export async function fetchStatsTaqProfile(
  athleteId: string
): Promise<ServiceResult<StatsTaqProfile>> {
  // If StatsTaq API is configured, use it
  if (STATSTAQ_API_URL && STATSTAQ_API_KEY) {
    try {
      const response = await fetch(
        `${STATSTAQ_API_URL}/athletes/${athleteId}/profile`,
        {
          headers: {
            'Authorization': `Bearer ${STATSTAQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`StatsTaq API error: ${response.status}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (err) {
      console.warn('StatsTaq API unavailable, falling back to local data:', err);
      // Fall through to local data
    }
  }

  // Fallback: fetch from local Supabase table
  return getLocalAthleteStats(athleteId);
}

/**
 * Fetch athlete stats from local database (self-reported or cached from StatsTaq)
 */
async function getLocalAthleteStats(
  athleteId: string
): Promise<ServiceResult<StatsTaqProfile>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('athlete_stats')
      .select('*')
      .eq('athlete_id', athleteId)
      .order('season', { ascending: false });

    if (error) {
      // Table might not exist yet — return mock data
      return { data: getMockProfile(athleteId), error: null };
    }

    if (!data || data.length === 0) {
      return { data: getMockProfile(athleteId), error: null };
    }

    return {
      data: {
        athlete_id: athleteId,
        connected: false,
        seasons: data as AthleteStats[],
      },
      error: null,
    };
  } catch {
    return { data: getMockProfile(athleteId), error: null };
  }
}

/**
 * Save self-reported stats for an athlete
 */
export async function saveAthleteStats(
  athleteId: string,
  season: string,
  sport: string,
  stats: Record<string, number | string>,
  highlights: StatHighlight[] = []
): Promise<ServiceResult<AthleteStats>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('athlete_stats')
      .upsert({
        athlete_id: athleteId,
        season,
        sport,
        source: 'self_reported',
        verified: false,
        stats,
        highlights,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'athlete_id,season',
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to save stats'),
    };
  }
}

// ─── Stat Formatters ───────────────────────────────────────────────────────

/** Get the key stats to display for a given sport */
export function getKeyStatsForSport(sport: string): string[] {
  const sportKey = sport.toLowerCase();

  const sportStats: Record<string, string[]> = {
    basketball: ['ppg', 'rpg', 'apg', 'fg_pct', 'three_pct'],
    football: ['passing_yards', 'rushing_yards', 'receiving_yards', 'tackles', 'gp'],
    soccer: ['goals', 'assists', 'shots_on_target', 'minutes_played'],
    baseball: ['avg', 'hr', 'rbi', 'obp', 'era'],
    softball: ['avg', 'hr', 'rbi', 'obp', 'era'],
    volleyball: ['kills', 'assists', 'digs', 'blocks', 'aces'],
    tennis: ['wins', 'losses', 'aces', 'first_serve_pct'],
    swimming: ['best_time', 'events', 'medals', 'personal_bests'],
    'track and field': ['best_time', 'best_distance', 'events', 'medals'],
    golf: ['scoring_avg', 'rounds', 'top_10', 'wins'],
    wrestling: ['wins', 'losses', 'pins', 'takedowns'],
    lacrosse: ['goals', 'assists', 'ground_balls', 'caused_turnovers'],
  };

  return sportStats[sportKey] || ['gp', 'highlights'];
}

/** Format a stat key into human-readable label */
export function formatStatLabel(key: string): string {
  const labels: Record<string, string> = {
    ppg: 'PTS/G',
    rpg: 'REB/G',
    apg: 'AST/G',
    spg: 'STL/G',
    bpg: 'BLK/G',
    fg_pct: 'FG%',
    three_pct: '3P%',
    ft_pct: 'FT%',
    mpg: 'MIN/G',
    gp: 'GP',
    passing_yards: 'Pass YDS',
    passing_tds: 'Pass TD',
    rushing_yards: 'Rush YDS',
    rushing_tds: 'Rush TD',
    receiving_yards: 'Rec YDS',
    receiving_tds: 'Rec TD',
    receptions: 'REC',
    tackles: 'TCKL',
    sacks: 'SACK',
    interceptions: 'INT',
    goals: 'G',
    assists: 'A',
    shots: 'SOT',
    shots_on_target: 'SOT',
    minutes_played: 'MIN',
    clean_sheets: 'CS',
    saves: 'SV',
    avg: 'AVG',
    hr: 'HR',
    rbi: 'RBI',
    sb: 'SB',
    obp: 'OBP',
    slg: 'SLG',
    era: 'ERA',
    strikeouts: 'SO',
    scoring_avg: 'AVG',
    wins: 'W',
    losses: 'L',
  };

  return labels[key] || key.replace(/_/g, ' ').toUpperCase();
}

/** Format stat value for display */
export function formatStatValue(key: string, value: number | string): string {
  if (typeof value === 'string') return value;

  // Percentages
  if (key.includes('pct') || key === 'obp' || key === 'slg' || key === 'avg') {
    return value < 1 ? `.${Math.round(value * 1000)}` : `${value.toFixed(1)}%`;
  }

  // ERA
  if (key === 'era') return value.toFixed(2);

  // Large numbers
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;

  // Decimals
  if (value % 1 !== 0) return value.toFixed(1);

  return String(value);
}

// ─── Mock Data ─────────────────────────────────────────────────────────────

function getMockProfile(athleteId: string): StatsTaqProfile {
  return {
    athlete_id: athleteId,
    connected: false,
    performance_score: 87,
    valuation: 15000,
    seasons: [
      {
        id: 'mock-season-1',
        athlete_id: athleteId,
        season: '2025-26',
        sport: 'Basketball',
        source: 'self_reported',
        verified: false,
        stats: {
          ppg: 18.5,
          rpg: 6.2,
          apg: 4.1,
          spg: 1.8,
          fg_pct: 0.485,
          three_pct: 0.372,
          ft_pct: 0.845,
          mpg: 32.4,
          gp: 28,
        },
        highlights: [
          { label: 'Points Per Game', value: 18.5, unit: 'ppg', percentile: 85, trend: 'up' },
          { label: 'Field Goal %', value: '48.5%', percentile: 72, trend: 'stable' },
          { label: 'Assists Per Game', value: 4.1, unit: 'apg', percentile: 78, trend: 'up' },
          { label: 'Games Played', value: 28, unit: 'games', trend: 'stable' },
        ],
        created_at: '2025-09-01T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
      },
    ],
  };
}
