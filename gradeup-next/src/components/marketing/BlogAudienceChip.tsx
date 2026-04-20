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
        bg: 'bg-[var(--accent-gold)]/10',
        border: 'border-[var(--accent-gold)]/30',
        text: 'text-[var(--accent-gold)]',
      };
    case 'athletes':
      return {
        bg: 'bg-[var(--accent-primary)]/10',
        border: 'border-[var(--accent-primary)]/30',
        text: 'text-[var(--accent-primary)]',
      };
    case 'brands':
      return {
        bg: 'bg-[var(--accent-success)]/10',
        border: 'border-[var(--accent-success)]/30',
        text: 'text-[var(--accent-success)]',
      };
    case 'state_ads':
      return {
        bg: 'bg-white/5',
        border: 'border-white/20',
        text: 'text-white/80',
      };
    case 'coaches':
      return {
        bg: 'bg-[var(--accent-primary)]/5',
        border: 'border-[var(--accent-primary)]/20',
        text: 'text-[var(--accent-primary)]/90',
      };
    case 'general':
      return {
        bg: 'bg-white/5',
        border: 'border-white/10',
        text: 'text-white/70',
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
