import Link from 'next/link';
import type { PublicBrandSummary } from '@/lib/hs-nil/brand-directory';

export function BrandDirectoryCard({ brand }: { brand: PublicBrandSummary }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="group block rounded-2xl border border-white/10 bg-black/30 p-5 transition hover:border-white/25 hover:bg-black/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
    >
      <div className="flex items-start gap-4">
        {brand.avatarUrl ? (
          <img
            src={brand.avatarUrl}
            alt={`${brand.companyName} logo`}
            className="h-14 w-14 flex-shrink-0 rounded-lg border border-white/10 bg-white/5 object-contain p-1"
          />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg font-semibold text-white/70">
            {brand.companyName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl leading-tight text-white">
            {brand.companyName}
          </h3>
          {(brand.city || brand.region) && (
            <p className="mt-0.5 text-xs uppercase tracking-widest text-white/40">
              {[brand.city, brand.region].filter(Boolean).join(' · ')}
            </p>
          )}
          {brand.bio && (
            <p className="mt-2 line-clamp-2 text-sm text-white/70">
              {brand.bio}
            </p>
          )}
        </div>
      </div>
      {brand.dealCategories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {brand.dealCategories.slice(0, 4).map((cat) => (
            <span
              key={cat}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/60"
            >
              {cat.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
