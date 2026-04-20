/**
 * Dynamic Open Graph image — /api/og/case-study/[slug]
 *
 * Returns a 1200x630 PNG rendered via `next/og` ImageResponse for a public
 * case study. Composes the study title + up to 3 top metrics.
 *
 * Runtime: edge (ImageResponse is edge-only).
 *
 * Data fetch: direct REST call against Supabase PostgREST, filtered by
 * slug=eq.{slug} and published=eq.true. We avoid importing the richer
 * case-studies service module here because it may pull Node built-ins
 * elsewhere in the graph. The anon key is used because the target rows
 * are public (published=true) and RLS exposes them to anon.
 *
 * Failure behavior: missing / unpublished / error → neutral fallback card.
 * A broken OG image hurts the share more than a generic-but-on-brand one.
 *
 * Cache: 5m browser / 1h CDN / 24h stale-while-revalidate. Studies are
 * rarely edited after publish; stale-while-revalidate absorbs the occasional
 * correction latency.
 */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const BG_GRADIENT =
  'linear-gradient(135deg, #02060B 0%, #0A1420 40%, #001F28 100%)';
const ACCENT_CYAN = '#00F0FF';
const ACCENT_GOLD = '#F5C518';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.72)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.52)';

interface StudyMetric {
  metric_label: string;
  metric_value: string;
  display_order: number;
}

interface StudyRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  case_study_metrics: StudyMetric[];
}

async function fetchPublishedStudy(slug: string): Promise<StudyRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;

  const endpoint = `${url}/rest/v1/case_studies?slug=eq.${encodeURIComponent(
    slug,
  )}&published=eq.true&select=id,slug,title,subtitle,case_study_metrics(metric_label,metric_value,display_order)&limit=1`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      // Edge runtime — default cache behavior is fine for a public endpoint.
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as StudyRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
  }
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
            GradeUp HS · Case Study
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
            Proven results.
            <br />
            Real scholar-athletes.
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
          <span>gradeupnil.com/business/case-studies</span>
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
    },
  );
}

function renderStudyResponse(study: StudyRow): ImageResponse {
  const metrics = [...(study.case_study_metrics ?? [])]
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 3);

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
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 20,
              letterSpacing: 6,
              textTransform: 'uppercase',
              color: ACCENT_CYAN,
              fontWeight: 700,
            }}
          >
            GradeUp HS · Case Study
          </span>
          <span
            style={{
              marginTop: 32,
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.02,
              letterSpacing: -2,
              maxWidth: 1040,
            }}
          >
            {study.title}
          </span>
          {study.subtitle ? (
            <span
              style={{
                marginTop: 18,
                fontSize: 26,
                color: TEXT_MUTED,
                lineHeight: 1.3,
                maxWidth: 980,
                fontWeight: 500,
              }}
            >
              {study.subtitle}
            </span>
          ) : null}
        </div>

        {metrics.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 32,
              justifyContent: 'flex-start',
              width: '100%',
            }}
          >
            {metrics.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  padding: '24px 28px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <span
                  style={{
                    fontSize: 44,
                    fontWeight: 800,
                    color: idx === 0 ? ACCENT_CYAN : ACCENT_GOLD,
                    letterSpacing: -1,
                  }}
                >
                  {m.metric_value}
                </span>
                <span
                  style={{
                    marginTop: 8,
                    fontSize: 20,
                    color: TEXT_MUTED,
                    fontWeight: 600,
                  }}
                >
                  {m.metric_label}
                </span>
              </div>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 22,
            color: TEXT_MUTED,
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            paddingTop: 24,
          }}
        >
          <span style={{ fontWeight: 600 }}>
            gradeupnil.com/business/case-studies
          </span>
          <span style={{ color: TEXT_DIM, fontSize: 20, fontWeight: 600 }}>
            Verified
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
    },
  );
}

export async function GET(
  _request: Request,
  { params }: RouteContext,
): Promise<ImageResponse> {
  try {
    const { slug } = await params;
    if (!slug) return fallbackResponse();
    const study = await fetchPublishedStudy(slug);
    if (!study) return fallbackResponse();
    return renderStudyResponse(study);
  } catch {
    return fallbackResponse();
  }
}
