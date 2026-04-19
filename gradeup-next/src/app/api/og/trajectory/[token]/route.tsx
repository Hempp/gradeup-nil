/**
 * Dynamic Open Graph image — /api/og/trajectory/[token]
 *
 * Returns a 1200x630 PNG rendered via `next/og` ImageResponse for the
 * public trajectory link. Composes the athlete identity + current GPA
 * as a share-card so Instagram / LinkedIn / X / group-chat previews
 * render "premium scholar-athlete card" instead of a generic favicon.
 *
 * Runtime: edge (ImageResponse is edge-only).
 *
 * Data fetch: getTrajectoryByPublicToken(token) — same service-role
 * lookup used by the public trajectory page. PII-minimized: only
 * identity fields we are willing to render on the public page surface
 * here (first name + last initial + school + sport + grad year +
 * current GPA + tier + completed deals count).
 *
 * Failure behavior: invalid / expired / revoked / missing tokens
 * do NOT 404. We render a neutral "Shareable Scholar-Athlete
 * Trajectory" fallback card — a broken OG image hurts shares more
 * than a generic one, and we don't want to leak "token revoked"
 * either (the athlete may have revoked it on purpose).
 *
 * Cache: 5m browser / 1h CDN / 24h stale-while-revalidate. The
 * underlying data changes rarely (GPA snapshots trickle in over
 * months); a fresh deal completion shows up within ~1hr of the
 * share-link fetch cycle.
 *
 * No external font fetches — we lean on system defaults to keep
 * cold-start cheap and rendering deterministic on the edge.
 */

import { ImageResponse } from 'next/og';
import {
  getTrajectoryByPublicToken,
  type Trajectory,
  type VerificationTier,
} from '@/lib/hs-nil/trajectory';

export const runtime = 'edge';

interface RouteContext {
  params: Promise<{ token: string }>;
}

// ---------------------------------------------------------------------------
// Brand palette (duplicated inline — edge runtime, no CSS access)
// ---------------------------------------------------------------------------

const BG_GRADIENT =
  'linear-gradient(135deg, #02060B 0%, #0A1420 40%, #001F28 100%)';
const ACCENT_CYAN = '#00F0FF';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.72)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.52)';

// Tier color coding — matches app conventions.
function tierBadge(tier: VerificationTier | null): {
  bg: string;
  fg: string;
  label: string;
} {
  switch (tier) {
    case 'institution_verified':
      return { bg: '#0EAD7A', fg: '#00140D', label: 'Institution-verified' };
    case 'user_submitted':
      return { bg: '#3B82F6', fg: '#00142E', label: 'Transcript-verified' };
    case 'self_reported':
      return { bg: '#6B7280', fg: '#0A0A0A', label: 'Self-reported' };
    default:
      return { bg: '#6B7280', fg: '#0A0A0A', label: 'Unverified' };
  }
}

// ---------------------------------------------------------------------------
// Fallback card — used on any failure path. No PII, no "link revoked" copy.
// ---------------------------------------------------------------------------

function fallbackResponse(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 88px',
          background: BG_GRADIENT,
          color: TEXT_PRIMARY,
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 22,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: ACCENT_CYAN,
              fontWeight: 700,
            }}
          >
            GradeUp HS
          </span>
          <span
            style={{
              marginTop: 40,
              fontSize: 88,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2,
            }}
          >
            Shareable
            <br />
            Scholar-Athlete
            <br />
            Trajectory.
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            color: TEXT_MUTED,
            fontSize: 24,
          }}
        >
          <span>Learn more at gradeupnil.com/hs</span>
          <span style={{ color: TEXT_DIM, fontSize: 20 }}>GradeUp HS</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control':
          'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        Vary: 'Accept-Encoding',
      },
    }
  );
}

// ---------------------------------------------------------------------------
// Athlete-specific card
// ---------------------------------------------------------------------------

function formatGpa(value: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(2);
}

function renderAthleteResponse(trajectory: Trajectory): ImageResponse {
  const { identity, deals } = trajectory;
  const gpa = formatGpa(identity.currentGpa);
  const badge = tierBadge(identity.currentTier);
  const completedDeals = deals.length;
  const SEP = '  \u00B7  '; // middle dot with surrounding spaces
  const classLine = [
    identity.graduationYear ? `Class of ${identity.graduationYear}` : null,
    identity.school,
    identity.sport,
  ]
    .filter(Boolean)
    .join(SEP);

  const dealLine =
    completedDeals === 0
      ? 'Verified Scholar-Athlete'
      : completedDeals === 1
        ? `1 completed deal${SEP}Verified Scholar-Athlete`
        : `${completedDeals} completed deals${SEP}Verified Scholar-Athlete`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          background: BG_GRADIENT,
          color: TEXT_PRIMARY,
          fontFamily:
            'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* Top row: eyebrow brand mark */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: 20,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: ACCENT_CYAN,
              fontWeight: 700,
            }}
          >
            {'GradeUp HS  \u00B7  Trajectory'}
          </span>
          {identity.stateCode ? (
            <span
              style={{
                fontSize: 20,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: TEXT_DIM,
                fontWeight: 600,
              }}
            >
              {identity.stateCode}
            </span>
          ) : null}
        </div>

        {/* Main split: name+meta on left, GPA stack on right */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Left — identity */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 700,
            }}
          >
            <span
              style={{
                fontSize: 104,
                fontWeight: 800,
                lineHeight: 0.98,
                letterSpacing: -3,
              }}
            >
              {identity.firstName}
              <br />
              {identity.lastInitial}.
            </span>
            <span
              style={{
                marginTop: 28,
                fontSize: 28,
                color: TEXT_MUTED,
                fontWeight: 500,
                lineHeight: 1.25,
              }}
            >
              {classLine || 'Scholar-Athlete'}
            </span>
          </div>

          {/* Right — GPA stack */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
            }}
          >
            <span
              style={{
                fontSize: 22,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: TEXT_DIM,
                fontWeight: 700,
              }}
            >
              Current GPA
            </span>
            <span
              style={{
                marginTop: 8,
                fontSize: 184,
                fontWeight: 800,
                lineHeight: 0.96,
                letterSpacing: -6,
                color: ACCENT_CYAN,
              }}
            >
              {gpa}
            </span>
            <span
              style={{
                marginTop: 12,
                display: 'flex',
                padding: '10px 22px',
                borderRadius: 999,
                background: badge.bg,
                color: badge.fg,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {badge.label}
            </span>
          </div>
        </div>

        {/* Bottom row: deals + brand attribution */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 22,
            color: TEXT_MUTED,
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            paddingTop: 28,
          }}
        >
          <span style={{ fontWeight: 600 }}>{dealLine}</span>
          <span style={{ color: TEXT_DIM, fontSize: 20, fontWeight: 600 }}>
            GradeUp HS
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control':
          'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        Vary: 'Accept-Encoding',
      },
    }
  );
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: RouteContext
): Promise<ImageResponse> {
  try {
    const { token } = await params;
    if (!token) return fallbackResponse();

    const result = await getTrajectoryByPublicToken(token).catch(() => null);
    if (!result) return fallbackResponse();

    return renderAthleteResponse(result.trajectory);
  } catch {
    // Any unexpected failure — render fallback rather than 500. A broken
    // image in the social unfurl hurts shares; a neutral card degrades
    // gracefully.
    return fallbackResponse();
  }
}
