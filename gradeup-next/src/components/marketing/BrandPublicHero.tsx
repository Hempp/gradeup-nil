import type { PublicBrand } from '@/lib/hs-nil/brand-directory';

export function BrandPublicHero({ brand }: { brand: PublicBrand }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      {brand.avatarUrl ? (
        <img
          src={brand.avatarUrl}
          alt={`${brand.companyName} logo`}
          className="h-28 w-28 flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 object-contain p-3"
        />
      ) : (
        <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-4xl font-semibold text-white/70">
          {brand.companyName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Brand partner
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
          {brand.companyName}
        </h1>
        {(brand.city || brand.region) && (
          <p className="mt-2 text-white/60">
            {[brand.city, brand.region].filter(Boolean).join(' · ')}
          </p>
        )}
        {brand.bio && (
          <p className="mt-4 max-w-2xl whitespace-pre-line text-white/80">
            {brand.bio}
          </p>
        )}
        {brand.website && (
          <a
            href={brand.website}
            target="_blank"
            rel="noopener nofollow"
            className="mt-4 inline-block text-sm text-[var(--accent-primary)] underline underline-offset-4"
          >
            {brand.website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>
    </div>
  );
}
