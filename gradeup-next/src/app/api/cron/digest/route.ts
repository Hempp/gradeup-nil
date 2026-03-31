import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  generateAthleteDigest,
  buildAthleteDigestEmail,
} from '@/lib/services/email-digest';

// ═══════════════════════════════════════════════════════════════════════════
// WEEKLY DIGEST CRON ENDPOINT
// Called by Vercel Cron (vercel.json) or external scheduler.
// Generates and sends weekly digest emails to all active athletes.
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Use service role for admin-level access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Get all active athletes
    const { data: athletes, error } = await supabase
      .from('athletes')
      .select('id')
      .eq('enrollment_verified', true)
      .limit(500); // Process in batches

    if (error) throw error;

    let sent = 0;
    let failed = 0;

    for (const athlete of athletes || []) {
      try {
        const digest = await generateAthleteDigest(athlete.id);
        if (!digest) continue;

        // Only send if there's something to report
        const { weekSummary } = digest;
        const hasActivity = weekSummary.newDealOffers > 0
          || weekSummary.profileViews > 5
          || weekSummary.earningsThisWeek > 0;

        if (!hasActivity) continue;

        const { subject, html } = buildAthleteDigestEmail(digest);

        // Send via configured email provider
        if (process.env.RESEND_API_KEY) {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM_ADDRESS || 'digest@gradeupnil.com',
              to: digest.email,
              subject,
              html,
            }),
          });
          sent++;
        }
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: athletes?.length || 0,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Digest generation failed' },
      { status: 500 }
    );
  }
}
