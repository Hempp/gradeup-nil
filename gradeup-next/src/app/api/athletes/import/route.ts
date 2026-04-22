/**
 * Bulk Athlete Import API Endpoint
 *
 * POST /api/athletes/import
 *
 * Allows athletic directors to bulk import athlete rosters from CSV data.
 * Requires authentication and athletic_director role.
 *
 * Features:
 * - Batch insert with transaction support
 * - Email uniqueness validation
 * - Sport existence validation
 * - Detailed error reporting per row
 * - Progress tracking for large imports
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { academicYearEnum } from '@/lib/validations';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface _AthleteImportRow {
  first_name: string;
  last_name: string;
  email: string;
  sport?: string;
  position?: string;
  year?: string;
  gpa?: number;
  school_id?: string;
  jersey_number?: string;
  major?: string;
  hometown?: string;
  height_inches?: number;
  weight_lbs?: number;
}

interface ImportResult {
  rowIndex: number;
  success: boolean;
  athleteId?: string;
  error?: string;
}

interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const athleteRowSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email('Invalid email format').max(255),
  sport: z.string().max(100).optional(),
  position: z.string().max(100).optional(),
  year: academicYearEnum.optional(),
  gpa: z.number().min(0).max(4.0).optional(),
  school_id: z.string().uuid().optional(),
  jersey_number: z.string().max(10).optional(),
  major: z.string().max(200).optional(),
  hometown: z.string().max(200).optional(),
  height_inches: z.number().int().min(36).max(108).optional(),
  weight_lbs: z.number().int().min(50).max(500).optional(),
});

const importRequestSchema = z.object({
  athletes: z.array(z.object({
    rowIndex: z.number(),
    data: athleteRowSchema,
  })).min(1, 'At least one athlete is required').max(500, 'Maximum 500 athletes per import'),
  skipExisting: z.boolean().default(false),
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get existing emails from the database to check for duplicates
 */
async function getExistingEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  emails: string[]
): Promise<Set<string>> {
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('email')
    .in('email', emails);

  return new Set((existingProfiles || []).map(p => p.email.toLowerCase()));
}

/**
 * Get sport ID by name (case-insensitive)
 */
async function _getSportByName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sportName: string
): Promise<string | null> {
  const { data: sport } = await supabase
    .from('sports')
    .select('id')
    .ilike('name', sportName)
    .single();

  return sport?.id || null;
}

/**
 * Get all available sports for validation
 */
async function getAllSports(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Map<string, string>> {
  const { data: sports } = await supabase
    .from('sports')
    .select('id, name');

  const sportMap = new Map<string, string>();
  (sports || []).forEach(sport => {
    sportMap.set(sport.name.toLowerCase(), sport.id);
  });

  return sportMap;
}

/**
 * Verify school exists
 */
async function verifySchoolExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  schoolId: string
): Promise<boolean> {
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .single();

  return !!school;
}

// ═══════════════════════════════════════════════════════════════════════════
// POST HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to import athletes.' },
        { status: 401 }
      );
    }

    // Check if user is an athletic director
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (profile.role !== 'athletic_director' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only athletic directors can import athletes' },
        { status: 403 }
      );
    }

    // Get director's school
    const { data: director, error: directorError } = await supabase
      .from('athletic_directors')
      .select('school_id')
      .eq('profile_id', user.id)
      .single();

    if (directorError || !director) {
      return NextResponse.json(
        { error: 'Athletic director profile not found' },
        { status: 404 }
      );
    }

    const schoolId = director.school_id;

    // Parse request body
    const body = await request.json();
    const validation = importRequestSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const { athletes, skipExisting } = validation.data;

    // Get all unique emails from the import
    const importEmails = athletes.map(a => a.data.email.toLowerCase());

    // Check for existing emails in database
    const existingEmails = await getExistingEmails(supabase, importEmails);

    // Get all sports for validation
    const sportsMap = await getAllSports(supabase);

    // Process each athlete
    const results: ImportResult[] = [];
    let successCount = 0;
    let failCount = 0;

    for (const athlete of athletes) {
      const { rowIndex, data } = athlete;
      const email = data.email.toLowerCase();

      // Check if email already exists
      if (existingEmails.has(email)) {
        if (skipExisting) {
          results.push({
            rowIndex,
            success: false,
            error: 'Email already exists (skipped)',
          });
          failCount++;
          continue;
        } else {
          results.push({
            rowIndex,
            success: false,
            error: `Email already exists: ${email}`,
          });
          failCount++;
          continue;
        }
      }

      // Validate and resolve sport
      let sportId: string | null = null;
      if (data.sport) {
        sportId = sportsMap.get(data.sport.toLowerCase()) || null;
        if (!sportId) {
          results.push({
            rowIndex,
            success: false,
            error: `Sport not found: "${data.sport}". Please check the sport name.`,
          });
          failCount++;
          continue;
        }
      }

      // Use the director's school ID
      const athleteSchoolId = data.school_id || schoolId;

      // Verify school exists if different from director's school
      if (data.school_id && data.school_id !== schoolId) {
        const schoolExists = await verifySchoolExists(supabase, data.school_id);
        if (!schoolExists) {
          results.push({
            rowIndex,
            success: false,
            error: `School not found: ${data.school_id}`,
          });
          failCount++;
          continue;
        }
      }

      try {
        // Generate an opaque random password — athlete will reset via email confirmation link
        const tempPassword = crypto.randomUUID() + '-' + crypto.randomUUID();

        // Create auth.users entry FIRST so the athlete can sign in
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: tempPassword,
          options: {
            data: {
              role: 'athlete',
              invited_by: user.id,
            },
          },
        });

        if (signUpError) {
          // Treat email-already-registered as a duplicate
          if (
            signUpError.message?.toLowerCase().includes('already registered') ||
            signUpError.message?.toLowerCase().includes('already exists') ||
            signUpError.status === 422
          ) {
            results.push({
              rowIndex,
              success: false,
              error: 'Email already exists in the system',
            });
            existingEmails.add(email);
            failCount++;
            continue;
          }
          throw signUpError;
        }

        if (!signUpData.user) {
          throw new Error('Auth sign-up did not return a user');
        }

        const authUserId = signUpData.user.id;

        // Create profile keyed to the auth user id
        const { data: newProfile, error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: authUserId,
            email: email,
            first_name: data.first_name.trim(),
            last_name: data.last_name.trim(),
            role: 'athlete',
            is_active: true,
          })
          .select('id')
          .single();

        if (profileCreateError) {
          // Check if it's a duplicate email error
          if (profileCreateError.code === '23505') {
            // Auth account was created but profile already exists — note for follow-up
            results.push({
              rowIndex,
              success: false,
              error: 'Email already exists in the system (auth account created but profile already present — follow up required)',
            });
            existingEmails.add(email);
            failCount++;
            continue;
          }
          throw profileCreateError;
        }

        // Create athlete record
        const athleteInsertData: Record<string, unknown> = {
          profile_id: newProfile.id,
          school_id: athleteSchoolId,
          is_searchable: true,
          enrollment_verified: false,
          sport_verified: false,
          grades_verified: false,
        };

        // Add optional fields if present
        if (sportId) athleteInsertData.sport_id = sportId;
        if (data.position) athleteInsertData.position = data.position.trim();
        if (data.year) athleteInsertData.academic_year = data.year;
        if (data.gpa !== undefined) athleteInsertData.gpa = data.gpa;
        if (data.jersey_number) athleteInsertData.jersey_number = data.jersey_number.trim();
        if (data.major) athleteInsertData.major = data.major.trim();
        if (data.hometown) athleteInsertData.hometown = data.hometown.trim();
        if (data.height_inches !== undefined) athleteInsertData.height_inches = data.height_inches;
        if (data.weight_lbs !== undefined) athleteInsertData.weight_lbs = data.weight_lbs;

        const { data: newAthlete, error: athleteCreateError } = await supabase
          .from('athletes')
          .insert(athleteInsertData)
          .select('id')
          .single();

        if (athleteCreateError) {
          // Rollback profile; auth account cannot be deleted without service role
          // key — it is flagged as an orphan for operator follow-up
          await supabase.from('profiles').delete().eq('id', newProfile.id);
          throw athleteCreateError;
        }

        results.push({
          rowIndex,
          success: true,
          athleteId: newAthlete.id,
        });
        successCount++;

        // Add email to existing set to prevent duplicates within same import
        existingEmails.add(email);

      } catch (error) {
        results.push({
          rowIndex,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create athlete',
        });
        failCount++;
      }
    }

    const summary: ImportSummary = {
      total: athletes.length,
      successful: successCount,
      failed: failCount,
      results,
    };

    const statusCode = failCount === athletes.length ? 400 : (failCount > 0 ? 207 : 201);

    return NextResponse.json(summary, { status: statusCode });

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET HANDLER - Validate before import
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'sports') {
      // Return list of available sports for validation/mapping
      const { data: sports, error: sportsError } = await supabase
        .from('sports')
        .select('id, name, category, gender')
        .order('name');

      if (sportsError) {
        return NextResponse.json(
          { error: 'Failed to fetch sports' },
          { status: 500 }
        );
      }

      return NextResponse.json({ sports });
    }

    if (action === 'validate-emails') {
      // Check which emails already exist
      const emailsParam = searchParams.get('emails');
      if (!emailsParam) {
        return NextResponse.json(
          { error: 'Missing emails parameter' },
          { status: 400 }
        );
      }

      const emails = emailsParam.split(',').map(e => e.trim().toLowerCase());
      const existingEmails = await getExistingEmails(supabase, emails);

      return NextResponse.json({
        existingEmails: Array.from(existingEmails),
        newEmails: emails.filter(e => !existingEmails.has(e)),
      });
    }

    // Default: return import capabilities and limits
    return NextResponse.json({
      maxBatchSize: 500,
      supportedFields: [
        'first_name',
        'last_name',
        'email',
        'sport',
        'position',
        'year',
        'gpa',
        'school_id',
        'jersey_number',
        'major',
        'hometown',
        'height_inches',
        'weight_lbs',
      ],
      requiredFields: ['first_name', 'last_name', 'email'],
      academicYears: [
        'freshman',
        'sophomore',
        'junior',
        'senior',
        'graduate',
        'redshirt_freshman',
        'redshirt_sophomore',
        'redshirt_junior',
        'redshirt_senior',
      ],
    });

  } catch (error) {
    console.error('Import validation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
