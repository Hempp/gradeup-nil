/**
 * BlogAudienceChip — small pill showing the audience for a blog post.
 *
 * Used on blog index cards and in the article header. Color tone matches
 * the existing marketing palette so it reads like part of the system.
 */
import type { BlogAudience } from '@/lib/hs-nil/blog-content';
import { audienceLabel } from '@/lib/hs-nil/blog-content';

export interface BlogAudienceChipProps {
  audience: BlogAudience;
  className?: string;
}

function audienceTone(audience: BlogAudience) {
  switch (audience) {
    case 'parents':
      return {
        bg: 'bg-amber-600/10',
        border: 'border-amber-600/30',
        text: 'text-amber-700',
      };
    case 'athletes':
      return {
        bg: 'bg-[var(--cobalt)]/10',
        border: 'border-[var(--cobalt)]/30',
        text: 'text-[var(--cobalt)]',
      };
    case 'brands':
      return {
        bg: 'bg-emerald-600/10',
        border: 'border-emerald-600/30',
        text: 'text-emerald-700',
      };
    case 'state_ads':
      return {
        bg: 'bg-[var(--cream-section)]',
        border: 'border-[var(--hairline)]',
        text: 'text-[var(--ink-muted)]',
      };
    case 'coaches':
      return {
        bg: 'bg-[var(--cobalt)]/5',
        border: 'border-[var(--cobalt)]/20',
        text: 'text-[var(--cobalt)]/90',
      };
    case 'general':
      return {
        bg: 'bg-[var(--cream-section)]',
        border: 'border-[var(--hairline)]',
        text: 'text-[var(--ink-meta)]',
      };
  }
}

export function BlogAudienceChip({ audience, className }: BlogAudienceChipProps) {
  const tone = audienceTone(audience);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-widest font-semibold ${tone.bg} ${tone.border} ${tone.text} ${className ?? ''}`}
    >
      {audienceLabel(audience)}
    </span>
  );
}
