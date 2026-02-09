/**
 * GradeUp NIL Platform - Academic Calendar Service
 *
 * Manages academic calendars, athlete availability preferences,
 * and scheduling for NIL deals around academic commitments.
 *
 * @module services/calendar
 * @version 1.0.0
 */

import { getSupabaseClient, getCurrentUser } from './supabase.js';
import { getMyAthleteId } from './helpers.js';

/**
 * @typedef {object} AcademicEvent
 * @property {string} id - Event UUID
 * @property {string} school_id - School UUID
 * @property {string} event_type - Type: finals, midterms, break, graduation, registration, other
 * @property {string} name - Event name
 * @property {string} start_date - Start date (YYYY-MM-DD)
 * @property {string} end_date - End date (YYYY-MM-DD)
 * @property {boolean} no_nil_activity - Whether NIL activity is blocked
 * @property {string} [academic_year] - Academic year (e.g., "2026-2027")
 * @property {string} [semester] - Semester: fall, spring, summer, winter
 */

/**
 * @typedef {object} AthleteAvailability
 * @property {string} id - Record UUID
 * @property {string} athlete_id - Athlete UUID
 * @property {object[]} blocked_periods - Custom blocked date ranges
 * @property {object} study_hours - Weekly study schedule
 * @property {number} max_deals_per_month - Maximum deals allowed per month
 * @property {boolean} no_finals_deals - Block deals during finals
 * @property {boolean} no_midterms_deals - Block deals during midterms
 * @property {string[]} preferred_deal_days - Preferred days for deals
 * @property {number} min_notice_days - Minimum days notice for deals
 * @property {number} max_hours_per_week - Maximum NIL hours per week
 * @property {string} [notes] - Additional notes
 */

/**
 * @typedef {object} BlockedPeriod
 * @property {string} period_type - Type of blocking period
 * @property {string} name - Name/description
 * @property {string} start_date - Start date
 * @property {string} end_date - End date
 * @property {string} source - Source: academic_calendar or athlete_preference
 */

/**
 * @typedef {object} SuggestedDate
 * @property {string} suggested_date - Date (YYYY-MM-DD)
 * @property {string} day_of_week - Day name
 * @property {boolean} is_preferred_day - Whether this is a preferred day
 * @property {number} availability_score - Score indicating how good this date is
 */

/**
 * Event types for academic calendar
 * @readonly
 */
export const EVENT_TYPES = {
  FINALS: 'finals',
  MIDTERMS: 'midterms',
  BREAK: 'break',
  GRADUATION: 'graduation',
  REGISTRATION: 'registration',
  OTHER: 'other',
};

/**
 * Semesters
 * @readonly
 */
export const SEMESTERS = {
  FALL: 'fall',
  SPRING: 'spring',
  SUMMER: 'summer',
  WINTER: 'winter',
};

/**
 * Days of the week
 * @readonly
 */
export const DAYS_OF_WEEK = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

/**
 * Get academic calendar for a school
 *
 * @param {string} schoolId - School UUID
 * @param {object} [options] - Query options
 * @param {string} [options.startDate] - Filter events starting from this date
 * @param {string} [options.endDate] - Filter events ending before this date
 * @param {string} [options.semester] - Filter by semester
 * @param {string} [options.academicYear] - Filter by academic year
 * @param {string[]} [options.eventTypes] - Filter by event types
 * @returns {Promise<{events: AcademicEvent[] | null, error: Error | null}>}
 */
export async function getAcademicCalendar(schoolId, options = {}) {
  const supabase = await getSupabaseClient();
  const { startDate, endDate, semester, academicYear, eventTypes } = options;

  let query = supabase
    .from('academic_calendars')
    .select('*')
    .eq('school_id', schoolId)
    .order('start_date');

  if (startDate) {
    query = query.gte('end_date', startDate);
  }

  if (endDate) {
    query = query.lte('start_date', endDate);
  }

  if (semester) {
    query = query.eq('semester', semester);
  }

  if (academicYear) {
    query = query.eq('academic_year', academicYear);
  }

  if (eventTypes && eventTypes.length > 0) {
    query = query.in('event_type', eventTypes);
  }

  const { data, error } = await query;

  return { events: data, error };
}

/**
 * Get academic calendar for the current athlete's school
 *
 * @param {object} [options] - Query options (same as getAcademicCalendar)
 * @returns {Promise<{events: AcademicEvent[] | null, error: Error | null}>}
 */
export async function getMySchoolCalendar(options = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { events: null, error: new Error('Athlete profile not found') };
  }

  // Get athlete's school
  const { data: athlete } = await supabase
    .from('athletes')
    .select('school_id')
    .eq('id', athleteId)
    .single();

  if (!athlete?.school_id) {
    return { events: null, error: new Error('School not found for athlete') };
  }

  return getAcademicCalendar(athlete.school_id, options);
}

/**
 * Get the current athlete's availability preferences
 *
 * @returns {Promise<{availability: AthleteAvailability | null, error: Error | null}>}
 */
export async function getMyAvailability() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { availability: null, error: new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .from('athlete_availability')
    .select('*')
    .eq('athlete_id', athleteId)
    .single();

  // Return default values if no record exists
  if (error?.code === 'PGRST116') {
    return {
      availability: {
        athlete_id: athleteId,
        blocked_periods: [],
        study_hours: {},
        max_deals_per_month: 5,
        no_finals_deals: true,
        no_midterms_deals: true,
        preferred_deal_days: ['friday', 'saturday', 'sunday'],
        min_notice_days: 3,
        max_hours_per_week: 10,
        notes: null,
      },
      error: null,
    };
  }

  return { availability: data, error };
}

/**
 * Get availability for a specific athlete (for brands)
 *
 * @param {string} athleteId - Athlete UUID
 * @returns {Promise<{availability: AthleteAvailability | null, error: Error | null}>}
 */
export async function getAthleteAvailability(athleteId) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from('athlete_availability')
    .select('*')
    .eq('athlete_id', athleteId)
    .single();

  if (error?.code === 'PGRST116') {
    // No custom availability set, return defaults
    return {
      availability: {
        athlete_id: athleteId,
        blocked_periods: [],
        max_deals_per_month: 5,
        no_finals_deals: true,
        no_midterms_deals: true,
        preferred_deal_days: ['friday', 'saturday', 'sunday'],
        min_notice_days: 3,
        max_hours_per_week: 10,
      },
      error: null,
    };
  }

  return { availability: data, error };
}

/**
 * Update the current athlete's availability preferences
 *
 * @param {object} settings - Availability settings to update
 * @param {object[]} [settings.blocked_periods] - Custom blocked periods
 * @param {object} [settings.study_hours] - Weekly study schedule
 * @param {number} [settings.max_deals_per_month] - Max deals per month
 * @param {boolean} [settings.no_finals_deals] - Block during finals
 * @param {boolean} [settings.no_midterms_deals] - Block during midterms
 * @param {string[]} [settings.preferred_deal_days] - Preferred days
 * @param {number} [settings.min_notice_days] - Minimum notice days
 * @param {number} [settings.max_hours_per_week] - Max hours per week
 * @param {string} [settings.notes] - Additional notes
 * @returns {Promise<{availability: AthleteAvailability | null, error: Error | null}>}
 */
export async function updateAvailability(settings) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { availability: null, error: new Error('Athlete profile not found') };
  }

  // Validate settings
  if (settings.max_deals_per_month !== undefined &&
      (settings.max_deals_per_month < 0 || settings.max_deals_per_month > 100)) {
    return { availability: null, error: new Error('Max deals per month must be between 0 and 100') };
  }

  if (settings.min_notice_days !== undefined &&
      (settings.min_notice_days < 0 || settings.min_notice_days > 30)) {
    return { availability: null, error: new Error('Minimum notice days must be between 0 and 30') };
  }

  if (settings.max_hours_per_week !== undefined &&
      (settings.max_hours_per_week < 0 || settings.max_hours_per_week > 40)) {
    return { availability: null, error: new Error('Max hours per week must be between 0 and 40') };
  }

  // Validate blocked periods format
  if (settings.blocked_periods) {
    for (const period of settings.blocked_periods) {
      if (!period.start_date || !period.end_date) {
        return { availability: null, error: new Error('Blocked periods must have start_date and end_date') };
      }
      if (new Date(period.start_date) > new Date(period.end_date)) {
        return { availability: null, error: new Error('Blocked period start date must be before end date') };
      }
    }
  }

  // Validate preferred days
  if (settings.preferred_deal_days) {
    const invalidDays = settings.preferred_deal_days.filter((d) => !DAYS_OF_WEEK.includes(d.toLowerCase()));
    if (invalidDays.length > 0) {
      return { availability: null, error: new Error(`Invalid days: ${invalidDays.join(', ')}`) };
    }
    settings.preferred_deal_days = settings.preferred_deal_days.map((d) => d.toLowerCase());
  }

  // Upsert availability record
  const { data, error } = await supabase
    .from('athlete_availability')
    .upsert({
      athlete_id: athleteId,
      ...settings,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'athlete_id',
    })
    .select()
    .single();

  return { availability: data, error };
}

/**
 * Add a custom blocked period
 *
 * @param {object} period - Blocked period to add
 * @param {string} period.start_date - Start date (YYYY-MM-DD)
 * @param {string} period.end_date - End date (YYYY-MM-DD)
 * @param {string} [period.name] - Optional name/reason
 * @returns {Promise<{availability: AthleteAvailability | null, error: Error | null}>}
 */
export async function addBlockedPeriod(period) {
  const { availability: current, error: fetchError } = await getMyAvailability();

  if (fetchError) {
    return { availability: null, error: fetchError };
  }

  const blockedPeriods = [...(current?.blocked_periods || []), {
    ...period,
    id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    created_at: new Date().toISOString(),
  }];

  return updateAvailability({ blocked_periods: blockedPeriods });
}

/**
 * Remove a custom blocked period
 *
 * @param {string} periodId - ID of the period to remove
 * @returns {Promise<{availability: AthleteAvailability | null, error: Error | null}>}
 */
export async function removeBlockedPeriod(periodId) {
  const { availability: current, error: fetchError } = await getMyAvailability();

  if (fetchError) {
    return { availability: null, error: fetchError };
  }

  const blockedPeriods = (current?.blocked_periods || []).filter((p) => p.id !== periodId);

  return updateAvailability({ blocked_periods: blockedPeriods });
}

/**
 * Check if an athlete is available on a specific date
 *
 * @param {string} athleteId - Athlete UUID
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @returns {Promise<{available: boolean, reason: string | null, error: Error | null}>}
 */
export async function checkAvailability(athleteId, date) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .rpc('is_athlete_available', {
      p_athlete_id: athleteId,
      p_date: date,
    });

  if (error) {
    return { available: false, reason: null, error };
  }

  // If not available, try to determine why
  if (!data) {
    const { periods } = await getBlockedPeriods(athleteId, date, date);
    const reason = periods && periods.length > 0
      ? `Blocked: ${periods[0].name} (${periods[0].period_type})`
      : 'Athlete is not available on this date';
    return { available: false, reason, error: null };
  }

  return { available: true, reason: null, error: null };
}

/**
 * Check availability for the current athlete
 *
 * @param {string} date - Date to check (YYYY-MM-DD)
 * @returns {Promise<{available: boolean, reason: string | null, error: Error | null}>}
 */
export async function checkMyAvailability(date) {
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { available: false, reason: null, error: new Error('Athlete profile not found') };
  }

  return checkAvailability(athleteId, date);
}

/**
 * Get all blocked periods for an athlete
 *
 * @param {string} athleteId - Athlete UUID
 * @param {string} [startDate] - Start of date range (defaults to today)
 * @param {string} [endDate] - End of date range (defaults to 6 months from now)
 * @returns {Promise<{periods: BlockedPeriod[] | null, error: Error | null}>}
 */
export async function getBlockedPeriods(athleteId, startDate, endDate) {
  const supabase = await getSupabaseClient();

  const start = startDate || new Date().toISOString().split('T')[0];
  const end = endDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await supabase
    .rpc('get_athlete_blocked_periods', {
      p_athlete_id: athleteId,
      p_start_date: start,
      p_end_date: end,
    });

  return { periods: data, error };
}

/**
 * Get blocked periods for the current athlete
 *
 * @param {string} [startDate] - Start of date range
 * @param {string} [endDate] - End of date range
 * @returns {Promise<{periods: BlockedPeriod[] | null, error: Error | null}>}
 */
export async function getMyBlockedPeriods(startDate, endDate) {
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { periods: null, error: new Error('Athlete profile not found') };
  }

  return getBlockedPeriods(athleteId, startDate, endDate);
}

/**
 * Suggest optimal dates for scheduling a deal with an athlete
 *
 * @param {string} athleteId - Athlete UUID
 * @param {number} [withinDays=30] - Number of days to look ahead
 * @returns {Promise<{suggestions: SuggestedDate[] | null, error: Error | null}>}
 */
export async function suggestDealTiming(athleteId, withinDays = 30) {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .rpc('suggest_deal_timing', {
      p_athlete_id: athleteId,
      p_within_days: withinDays,
    });

  if (error) {
    return { suggestions: null, error };
  }

  // Sort by availability score descending
  const sorted = (data || []).sort((a, b) => b.availability_score - a.availability_score);

  return { suggestions: sorted, error: null };
}

/**
 * Get deal timing suggestions for the current athlete
 *
 * @param {number} [withinDays=30] - Number of days to look ahead
 * @returns {Promise<{suggestions: SuggestedDate[] | null, error: Error | null}>}
 */
export async function suggestMyDealTiming(withinDays = 30) {
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { suggestions: null, error: new Error('Athlete profile not found') };
  }

  return suggestDealTiming(athleteId, withinDays);
}

/**
 * Get upcoming academic events that may block NIL activity
 *
 * @param {string} athleteId - Athlete UUID
 * @param {number} [withinDays=90] - Days to look ahead
 * @returns {Promise<{events: AcademicEvent[] | null, error: Error | null}>}
 */
export async function getUpcomingBlockingEvents(athleteId, withinDays = 90) {
  const supabase = await getSupabaseClient();

  // Get athlete's school
  const { data: athlete } = await supabase
    .from('athletes')
    .select('school_id')
    .eq('id', athleteId)
    .single();

  if (!athlete?.school_id) {
    return { events: null, error: new Error('School not found') };
  }

  // Get athlete's availability preferences
  const { availability } = await getAthleteAvailability(athleteId);

  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let query = supabase
    .from('academic_calendars')
    .select('*')
    .eq('school_id', athlete.school_id)
    .eq('no_nil_activity', true)
    .gte('end_date', today)
    .lte('start_date', endDate)
    .order('start_date');

  const { data, error } = await query;

  if (error) {
    return { events: null, error };
  }

  // Filter based on athlete preferences
  const filtered = (data || []).filter((event) => {
    if (event.event_type === 'finals' && !availability?.no_finals_deals) {
      return false;
    }
    if (event.event_type === 'midterms' && !availability?.no_midterms_deals) {
      return false;
    }
    return true;
  });

  return { events: filtered, error: null };
}

/**
 * Create or update an academic calendar event (for athletic directors)
 *
 * @param {object} event - Event data
 * @param {string} event.school_id - School UUID
 * @param {string} event.event_type - Event type
 * @param {string} event.name - Event name
 * @param {string} event.start_date - Start date
 * @param {string} event.end_date - End date
 * @param {boolean} [event.no_nil_activity] - Block NIL activity
 * @param {string} [event.academic_year] - Academic year
 * @param {string} [event.semester] - Semester
 * @param {string} [event.id] - Event ID for updates
 * @returns {Promise<{event: AcademicEvent | null, error: Error | null}>}
 */
export async function saveCalendarEvent(event) {
  const supabase = await getSupabaseClient();

  // Validate event type
  if (!Object.values(EVENT_TYPES).includes(event.event_type)) {
    return { event: null, error: new Error(`Invalid event type: ${event.event_type}`) };
  }

  // Validate dates
  if (new Date(event.start_date) > new Date(event.end_date)) {
    return { event: null, error: new Error('Start date must be before end date') };
  }

  const eventData = {
    school_id: event.school_id,
    event_type: event.event_type,
    name: event.name,
    start_date: event.start_date,
    end_date: event.end_date,
    no_nil_activity: event.no_nil_activity ?? true,
    academic_year: event.academic_year,
    semester: event.semester,
  };

  let result;
  if (event.id) {
    // Update existing
    result = await supabase
      .from('academic_calendars')
      .update(eventData)
      .eq('id', event.id)
      .select()
      .single();
  } else {
    // Create new
    result = await supabase
      .from('academic_calendars')
      .insert(eventData)
      .select()
      .single();
  }

  return { event: result.data, error: result.error };
}

/**
 * Delete an academic calendar event (for athletic directors)
 *
 * @param {string} eventId - Event UUID
 * @returns {Promise<{success: boolean, error: Error | null}>}
 */
export async function deleteCalendarEvent(eventId) {
  const supabase = await getSupabaseClient();

  const { error } = await supabase
    .from('academic_calendars')
    .delete()
    .eq('id', eventId);

  return { success: !error, error };
}

/**
 * Get availability summary for an athlete
 *
 * @param {string} athleteId - Athlete UUID
 * @returns {Promise<{summary: object | null, error: Error | null}>}
 */
export async function getAvailabilitySummary(athleteId) {
  const [
    { availability },
    { periods: blockedPeriods },
    { suggestions },
  ] = await Promise.all([
    getAthleteAvailability(athleteId),
    getBlockedPeriods(athleteId),
    suggestDealTiming(athleteId, 30),
  ]);

  const summary = {
    preferences: {
      max_deals_per_month: availability?.max_deals_per_month || 5,
      no_finals_deals: availability?.no_finals_deals ?? true,
      no_midterms_deals: availability?.no_midterms_deals ?? true,
      preferred_days: availability?.preferred_deal_days || ['friday', 'saturday', 'sunday'],
      min_notice_days: availability?.min_notice_days || 3,
      max_hours_per_week: availability?.max_hours_per_week || 10,
    },
    blocked_periods_count: blockedPeriods?.length || 0,
    upcoming_blocked: blockedPeriods?.slice(0, 5) || [],
    next_available_dates: suggestions?.slice(0, 5) || [],
    best_day_score: suggestions?.[0]?.availability_score || null,
  };

  return { summary, error: null };
}

export default {
  getAcademicCalendar,
  getMySchoolCalendar,
  getMyAvailability,
  getAthleteAvailability,
  updateAvailability,
  addBlockedPeriod,
  removeBlockedPeriod,
  checkAvailability,
  checkMyAvailability,
  getBlockedPeriods,
  getMyBlockedPeriods,
  suggestDealTiming,
  suggestMyDealTiming,
  getUpcomingBlockingEvents,
  saveCalendarEvent,
  deleteCalendarEvent,
  getAvailabilitySummary,
  EVENT_TYPES,
  SEMESTERS,
  DAYS_OF_WEEK,
};
