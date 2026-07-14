import Link from 'next/link';
import Image from 'next/image';
import type { PublicBrandSummary } from '@/lib/hs-nil/brand-directory';

export function BrandDirectoryCard({ brand }: { brand: PublicBrandSummary }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      className="marketing-dark card-marketing group block rounded-2xl p-5 hover-lift transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cobalt)]"
    >
      <div className="flex items-start gap-4">
        {brand.avatarUrl ? (
          <Image
            src={brand.avatarUrl}
            alt={`${brand.companyName} logo`}
            width={56}
            height={56}
            className="h-14 w-14 flex-shrink-0 rounded-lg border border-[var(--hairline)] bg-[var(--cream-section)] object-contain p-1"
          />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--cream-section)] text-lg font-semibold text-[var(--ink-meta)]">
            {brand.companyName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl leading-tight text-[var(--ink)]">
            {brand.companyName}
          </h3>
          {(brand.city || brand.region) && (
            <p className="eyebrow mt-0.5">
              {[brand.city, brand.region].filter(Boolean).join(' · ')}
            </p>
          )}
          {brand.bio && (
            <p className="mt-2 line-clamp-2 text-sm text-[var(--ink-muted)]">
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
              className="rounded-full border border-[var(--hairline)] bg-[var(--cream-section)] px-2 py-0.5 text-xs text-[var(--ink-meta)]"
            >
              {cat.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
