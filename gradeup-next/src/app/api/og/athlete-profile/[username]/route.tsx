/**
 * Dynamic Open Graph image — /api/og/athlete-profile/[username]
 *
 * 1200x630 PNG rendered via `next/og` ImageResponse for the public
 * athlete profile at /athletes/[username]. Mirrors the trajectory
 * OG card pattern so the visual language is consistent across
 * share surfaces.
 *
 * Runtime: edge.
 *
 * PII: only fields already on the public page — first name, last
 * initial, GPA, tier, school, sport, state, grad year. No amounts,
 * no parents, no email.
 *
 * Failure behavior: missing / non-visible / invalid usernames
 * render a neutral fallback rather than 404 (a broken unfurl
 * hurts shares more than a generic one).
 */

import { ImageResponse } from 'next/og';
import {
  getPublicProfileByUsername,
  type PublicAthleteProfile,
} from '@/lib/hs-nil/athlete-profile';
import type { VerificationTier } from '@/lib/hs-nil/trajectory';

// Running on Node.js: a transitive import via @/lib/hs-nil/trajectory pulls in
// node:crypto, which the Edge runtime does not support. Trade a slightly slower
// cold start for a successful build.
export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ username: string }>;
}

const BG_GRADIENT =
  'linear-gradient(135deg, #02060B 0%, #0A1420 40%, #001F28 100%)';
const ACCENT_CYAN = '#00F0FF';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.72)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.52)';

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

function formatGpa(value: number | null): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return value.toFixed(2);
}

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
            Verified
            <br />
            Scholar-Athlete.
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
          <span>gradeupnil.com/athletes</span>
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

function renderProfileResponse(profile: PublicAthleteProfile): ImageResponse {
  const gpa = formatGpa(profile.currentGpa);
  const badge = tierBadge(profile.currentTier);
  const SEP = '  \u00B7  ';
  const classLine = [
    profile.graduationYear ? `Class of ${profile.graduationYear}` : null,
    profile.school,
    profile.sport,
  ]
    .filter(Boolean)
    .join(SEP);

  const dealsN = profile.completedDealsCount;
  const dealLine =
    dealsN === 0
      ? 'Verified Scholar-Athlete'
      : dealsN === 1
        ? `1 completed deal${SEP}Verified Scholar-Athlete`
        : `${dealsN} completed deals${SEP}Verified Scholar-Athlete`;

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
            {'GradeUp HS  \u00B7  @' + profile.username}
          </span>
          {profile.stateCode ? (
            <span
              style={{
                fontSize: 20,
                letterSpacing: 3,
                textTransform: 'uppercase',
                color: TEXT_DIM,
                fontWeight: 600,
              }}
            >
              {profile.stateCode}
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
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
              {profile.firstName}
              <br />
              {profile.lastInitial}.
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
            gradeupnil.com
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

export async function GET(
  _request: Request,
  { params }: RouteContext
): Promise<ImageResponse> {
  try {
    const { username } = await params;
    if (!username) return fallbackResponse();

    const profile = await getPublicProfileByUsername(username).catch(() => null);
    if (!profile) return fallbackResponse();
    return renderProfileResponse(profile);
  } catch {
    return fallbackResponse();
  }
}
