/**
 * Dynamic Open Graph image — /api/og/brand-profile/[slug]
 *
 * 1200x630 PNG rendered via `next/og` ImageResponse for a public brand page.
 * Layout: logo (avatar) + brand name + location + tagline (first sentence of
 * the brand bio). Runtime: edge (ImageResponse is edge-only).
 *
 * Data fetch: PostgREST direct call, filtered by public_slug=eq.{slug} AND
 * public_visibility=eq.true. Anon key is sufficient because RLS exposes
 * opted-in rows.
 *
 * Fallback: neutral card on any error / unknown slug.
 */

import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ slug: string }>;
}

const BG_GRADIENT =
  'linear-gradient(135deg, #02060B 0%, #0A1420 40%, #001F28 100%)';
const ACCENT_CYAN = '#00F0FF';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_MUTED = 'rgba(255, 255, 255, 0.72)';
const TEXT_DIM = 'rgba(255, 255, 255, 0.52)';

interface BrandRow {
  id: string;
  company_name: string;
  public_slug: string;
  public_bio: string | null;
  public_avatar_url: string | null;
  public_location_city: string | null;
  public_location_region: string | null;
}

async function fetchPublicBrand(slug: string): Promise<BrandRow | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const shape = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  if (!shape.test(slug)) return null;

  const endpoint = `${url}/rest/v1/brands?public_slug=eq.${encodeURIComponent(
    slug,
  )}&public_visibility=eq.true&select=id,company_name,public_slug,public_bio,public_avatar_url,public_location_city,public_location_region&limit=1`;

  try {
    const res = await fetch(endpoint, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as BrandRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows[0];
  } catch {
    return null;
  }
}

function firstSentence(bio: string | null): string | null {
  if (!bio) return null;
  const trimmed = bio.trim();
  if (!trimmed) return null;
  const sentenceRe = /^([^.!?]{8,200}[.!?])/;
  const match = trimmed.match(sentenceRe);
  return (match ? match[1] : trimmed).slice(0, 200);
}

function locationLabel(row: BrandRow): string | null {
  const parts = [row.public_location_city, row.public_location_region].filter(
    (p): p is string => Boolean(p && p.trim()),
  );
  return parts.length > 0 ? parts.join(', ') : null;
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
            GradeUp HS · Brands
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
            Local brands.
            <br />
            Real deals.
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            color: TEXT_MUTED,
            fontSize: 22,
          }}
        >
          <span>gradeupnil.com/brands</span>
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

function renderBrandResponse(brand: BrandRow): ImageResponse {
  const tagline = firstSentence(brand.public_bio);
  const loc = locationLabel(brand);
  const initial = (brand.company_name[0] ?? 'G').toUpperCase();

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
            GradeUp HS · Brand
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              marginTop: 36,
            }}
          >
            {brand.public_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.public_avatar_url}
                alt=""
                width={160}
                height={160}
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 28,
                  objectFit: 'cover',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(255, 255, 255, 0.06)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 28,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 80,
                  fontWeight: 800,
                  color: ACCENT_CYAN,
                }}
              >
                {initial}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <span
                style={{
                  fontSize: 66,
                  fontWeight: 800,
                  lineHeight: 1.02,
                  letterSpacing: -2,
                  maxWidth: 820,
                }}
              >
                {brand.company_name}
              </span>
              {loc ? (
                <span
                  style={{
                    marginTop: 14,
                    fontSize: 26,
                    color: TEXT_MUTED,
                    fontWeight: 600,
                  }}
                >
                  {loc}
                </span>
              ) : null}
            </div>
          </div>

          {tagline ? (
            <span
              style={{
                marginTop: 40,
                fontSize: 26,
                color: TEXT_MUTED,
                lineHeight: 1.3,
                maxWidth: 1040,
                fontWeight: 500,
              }}
            >
              {tagline}
            </span>
          ) : null}
        </div>

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
            gradeupnil.com/brands/{brand.public_slug}
          </span>
          <span style={{ color: TEXT_DIM, fontSize: 20, fontWeight: 600 }}>
            HS-enabled
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
    const brand = await fetchPublicBrand(slug);
    if (!brand) return fallbackResponse();
    return renderBrandResponse(brand);
  } catch {
    return fallbackResponse();
  }
}
