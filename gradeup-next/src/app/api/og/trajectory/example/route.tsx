/**
 * Dev-only OG preview — /api/og/trajectory/example
 *
 * Renders a hardcoded sample trajectory card so designers can iterate
 * on the layout without needing a live share token. Gated behind
 * NODE_ENV !== 'production' — the prod handler 404s so we don't leak
 * a decoy card into search crawlers.
 *
 * Intentional duplication with the [token] route: this file imports
 * nothing from that handler so we can iterate on sample content
 * without touching the production path.
 */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const BG_GRADIENT =
  'linear-gradient(135deg, #02060B 0%, #0A1420 40%, #001F28 100%)';
const ACCENT_CYAN = '#00F0FF';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.72)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.52)';

export async function GET(): Promise<Response> {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 });
  }

  const SEP = '  \u00B7  ';
  const first = 'Jordan';
  const initial = 'R';
  const classLine = ['Class of 2027', 'Oakwood HS', 'Basketball'].join(SEP);
  const dealLine = `3 completed deals${SEP}Verified Scholar-Athlete`;

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
            {'GradeUp HS  \u00B7  Trajectory'}
          </span>
          <span
            style={{
              fontSize: 20,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: TEXT_DIM,
              fontWeight: 600,
            }}
          >
            CA
          </span>
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
              {first}
              <br />
              {initial}.
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
              {classLine}
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
              3.82
            </span>
            <span
              style={{
                marginTop: 12,
                display: 'flex',
                padding: '10px 22px',
                borderRadius: 999,
                background: '#0EAD7A',
                color: '#00140D',
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              Institution-verified
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
            GradeUp HS
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
