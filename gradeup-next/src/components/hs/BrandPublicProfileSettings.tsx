'use client';

/**
 * Settings client component for /hs/brand/public-profile. Wires the slug
 * claim form, visibility toggle, bio editor, website field, region select,
 * and logo upload against the five /api/hs/brand/public-profile routes.
 */

import { useCallback, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { BrandSlugAvailabilityField } from './BrandSlugAvailabilityField';

export interface BrandPublicProfileSettingsProps {
  brandId: string;
  initial: {
    slug: string | null;
    visibility: boolean;
    bio: string | null;
    website: string | null;
    avatarUrl: string | null;
    city: string | null;
    region: string | null;
  };
  pilotStates: Array<{ code: string; name: string }>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const MAX_BIO = 500;

export function BrandPublicProfileSettings({
  brandId: _brandId,
  initial,
  pilotStates,
}: BrandPublicProfileSettingsProps) {
  void _brandId;
  const bioId = useId();
  const websiteId = useId();
  const cityId = useId();
  const regionId = useId();

  const [slug, setSlug] = useState<string | null>(initial.slug);
  const [slugClaimError, setSlugClaimError] = useState<string | null>(null);
  const [claimInput, setClaimInput] = useState('');
  const [claimAvailable, setClaimAvailable] = useState(false);

  const [visibility, setVisibility] = useState(initial.visibility);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  const [bio, setBio] = useState(initial.bio ?? '');
  const [website, setWebsite] = useState(initial.website ?? '');
  const [city, setCity] = useState(initial.city ?? '');
  const [region, setRegion] = useState(initial.region ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const handleClaimSlug = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSlugClaimError(null);
      if (!claimAvailable || !claimInput) return;
      try {
        const res = await fetch('/api/hs/brand/public-profile/claim-slug', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: claimInput }),
        });
        const data = (await res.json()) as { ok?: boolean; slug?: string; error?: string };
        if (!res.ok || !data.ok) {
          setSlugClaimError(data.error ?? 'Failed to claim slug');
          return;
        }
        setSlug(data.slug ?? claimInput);
      } catch {
        setSlugClaimError('Network error');
      }
    },
    [claimAvailable, claimInput],
  );

  const handleVisibility = useCallback(
    async (next: boolean) => {
      setVisibilityError(null);
      try {
        const res = await fetch('/api/hs/brand/public-profile/visibility', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ visible: next }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setVisibilityError(data.error ?? 'Could not update visibility');
          return;
        }
        setVisibility(next);
      } catch {
        setVisibilityError('Network error');
      }
    },
    [],
  );

  const handleSave = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSaveState('saving');
      setSaveError(null);
      try {
        const res = await fetch('/api/hs/brand/public-profile/update', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            bio: bio.trim() === '' ? null : bio.trim(),
            website: website.trim() === '' ? null : website.trim(),
            city: city.trim() === '' ? null : city.trim(),
            region: region.trim() === '' ? null : region.trim().toUpperCase(),
          }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) {
          setSaveState('error');
          setSaveError(data.error ?? 'Save failed');
          return;
        }
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2500);
      } catch {
        setSaveState('error');
        setSaveError('Network error');
      }
    },
    [bio, website, city, region],
  );

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadBusy(true);
      setUploadErr(null);
      try {
        const form = new FormData();
        form.append('file', file);
        const res = await fetch(
          '/api/hs/brand/public-profile/avatar-upload',
          { method: 'POST', body: form },
        );
        const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
        if (!res.ok || !data.ok) {
          setUploadErr(data.error ?? 'Upload failed');
          return;
        }
        setAvatarUrl(data.url ?? null);
      } catch {
        setUploadErr('Network error');
      } finally {
        setUploadBusy(false);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [],
  );

  return (
    <div className="space-y-10">
      {/* Slug claim */}
      <section
        aria-labelledby="slug-heading"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 id="slug-heading" className="font-display text-2xl">
          Public URL
        </h2>
        {slug ? (
          <div className="mt-3 text-sm text-white/80">
            Your public page is live at{' '}
            <Link
              href={`/brands/${slug}`}
              className="font-semibold text-[var(--accent-primary)] hover:underline"
            >
              /brands/{slug}
            </Link>
            .
            <p className="mt-2 text-xs text-white/50">
              Slugs are locked once claimed. Contact support if you need a
              change.
            </p>
          </div>
        ) : (
          <form onSubmit={handleClaimSlug} className="mt-4 space-y-4">
            <BrandSlugAvailabilityField
              onAvailabilityChange={({ slug: v, available }) => {
                setClaimInput(v);
                setClaimAvailable(available);
              }}
            />
            {slugClaimError && (
              <p className="text-sm text-[color:var(--error,#D23B3B)]">
                {slugClaimError}
              </p>
            )}
            <button
              type="submit"
              disabled={!claimAvailable}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Claim slug
            </button>
          </form>
        )}
      </section>

      {/* Visibility */}
      <section
        aria-labelledby="vis-heading"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 id="vis-heading" className="font-display text-2xl">
          Directory visibility
        </h2>
        <p className="mt-1 text-sm text-white/60">
          When on, your brand appears on /brands and your /brands/{slug ?? '—'}{' '}
          page is publicly indexable. Default is off.
        </p>
        <div className="mt-4 flex items-start gap-4">
          <button
            type="button"
            disabled={!slug}
            onClick={() => handleVisibility(!visibility)}
            aria-pressed={visibility}
            className={`inline-flex min-h-[44px] min-w-[120px] items-center justify-center rounded-xl border px-5 py-3 text-sm font-semibold transition-colors ${
              visibility
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] text-black'
                : 'border-white/20 bg-transparent text-white hover:bg-white/10'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {visibility ? 'Visible' : 'Hidden'}
          </button>
          {!slug && (
            <p className="text-sm text-white/50">
              Claim a slug above before enabling visibility.
            </p>
          )}
        </div>
        {visibility && (
          <p className="mt-3 text-xs text-white/60">
            Heads up: turning visibility on publishes your brand to a public
            SEO-indexable page. No athlete PII or deal amounts are ever shown.
          </p>
        )}
        {visibilityError && (
          <p className="mt-2 text-sm text-[color:var(--error,#D23B3B)]">
            {visibilityError}
          </p>
        )}
      </section>

      {/* Logo / avatar */}
      <section
        aria-labelledby="logo-heading"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 id="logo-heading" className="font-display text-2xl">
          Logo
        </h2>
        <p className="mt-1 text-sm text-white/60">
          PNG, JPG, WebP, or SVG. Max 4MB.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <div className="h-24 w-24 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] flex items-center justify-center">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Brand logo preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-white/40">Logo</span>
            )}
          </div>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleUpload}
              className="block text-sm text-white/80 file:mr-3 file:min-h-[44px] file:rounded-xl file:border-0 file:bg-[var(--accent-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black hover:file:opacity-90"
              disabled={uploadBusy}
            />
            {uploadBusy && (
              <p className="mt-2 text-xs text-white/50">Uploading…</p>
            )}
            {uploadErr && (
              <p className="mt-2 text-xs text-[color:var(--error,#D23B3B)]">
                {uploadErr}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bio + website + location */}
      <section
        aria-labelledby="profile-heading"
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
      >
        <h2 id="profile-heading" className="font-display text-2xl">
          Profile
        </h2>
        <form onSubmit={handleSave} className="mt-4 space-y-5">
          <div>
            <label
              htmlFor={bioId}
              className="block text-sm font-semibold text-white"
            >
              Bio
            </label>
            <textarea
              id={bioId}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              rows={4}
              maxLength={MAX_BIO}
              placeholder="Tell scholar-athletes (and their parents) what you are about, in a sentence or two."
              className="mt-2 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
            />
            <p className="mt-1 text-xs text-white/50">
              {bio.length}/{MAX_BIO}
            </p>
          </div>

          <div>
            <label
              htmlFor={websiteId}
              className="block text-sm font-semibold text-white"
            >
              Website
            </label>
            <input
              id={websiteId}
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourbrand.com"
              pattern="https://.*"
              className="mt-2 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
            />
            <p className="mt-1 text-xs text-white/50">Must be https://</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor={cityId}
                className="block text-sm font-semibold text-white"
              >
                City
              </label>
              <input
                id={cityId}
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={100}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
              />
            </div>
            <div>
              <label
                htmlFor={regionId}
                className="block text-sm font-semibold text-white"
              >
                State
              </label>
              <select
                id={regionId}
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="mt-2 min-h-[44px] w-full rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
              >
                <option value="">— Select —</option>
                {pilotStates.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saveState === 'saving'}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveState === 'saving' ? 'Saving…' : 'Save profile'}
            </button>
            {saveState === 'saved' && (
              <span className="text-sm text-[var(--accent-primary)]">
                Saved.
              </span>
            )}
            {saveState === 'error' && saveError && (
              <span className="text-sm text-[color:var(--error,#D23B3B)]">
                {saveError}
              </span>
            )}
          </div>
        </form>
      </section>

      {slug && (
        <p className="text-sm">
          <Link
            href={`/brands/${slug}`}
            className="font-semibold text-[var(--accent-primary)] hover:underline"
          >
            View your public brand page →
          </Link>
        </p>
      )}
    </div>
  );
}
