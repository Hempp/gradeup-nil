import Image from 'next/image';
import type { PublicBrand } from '@/lib/hs-nil/brand-directory';

export function BrandPublicHero({ brand }: { brand: PublicBrand }) {
  return (
    <div className="marketing-dark flex flex-col gap-6 bg-[var(--cream)] md:flex-row md:items-start">
      {brand.avatarUrl ? (
        <Image
          src={brand.avatarUrl}
          alt={`${brand.companyName} logo`}
          width={112}
          height={112}
          className="h-28 w-28 flex-shrink-0 rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] object-contain p-3"
        />
      ) : (
        <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--hairline)] bg-[var(--cream-surface)] text-4xl font-semibold text-[var(--ink-meta)]">
          {brand.companyName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1">
        <p className="eyebrow">
          Brand partner
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight text-[var(--ink)] md:text-5xl">
          {brand.companyName}
        </h1>
        {(brand.city || brand.region) && (
          <p className="mt-2 text-[var(--ink-muted)]">
            {[brand.city, brand.region].filter(Boolean).join(' · ')}
          </p>
        )}
        {brand.bio && (
          <p className="mt-4 max-w-2xl whitespace-pre-line text-[var(--ink-muted)]">
            {brand.bio}
          </p>
        )}
        {brand.website && (
          <a
            href={brand.website}
            target="_blank"
            rel="noopener nofollow"
            className="mt-4 inline-block text-sm text-[var(--cobalt)] underline underline-offset-4"
          >
            {brand.website.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>
    </div>
  );
}
