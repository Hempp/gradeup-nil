'use client';

/**
 * ShareCopyCard — per-platform editable share copy + ShareButtonStack host.
 *
 * Why editable:
 *   Parents want agency. The brand-approved template is the starting point;
 *   the parent and athlete can rewrite every word before it hits Instagram.
 *   Forcing locked copy kills the viral loop — concierge interviews showed
 *   parents would rather not share than post a corporate-sounding line.
 *
 * Character counters:
 *   X caps tweets at 280 chars. Instagram captions are effectively
 *   unlimited (2,200-char soft cap, noted to the user if they approach).
 *   LinkedIn caps at 3,000. TikTok caption limit is 2,200. We show the
 *   counter + a "getting long" warning as a soft gate — never block.
 *
 * Copy-to-clipboard:
 *   Separate button wired to navigator.clipboard. Fires a share-event with
 *   platform='copy_link' (the analytics row distinguishes it from the
 *   platform-specific button taps).
 */

import { useCallback, useMemo, useState } from 'react';
import { ShareButtonStack } from '@/components/hs/ShareButtonStack';
import type { SharePlatform } from '@/lib/hs-nil/share';

export interface ShareCopyCardProps {
  dealId: string;
  platform: SharePlatform;
  templateId: string | null;
  initialCopy: string;
  shareUrl: string;
}

interface PlatformMeta {
  label: string;
  charLimit: number;
  warnAt: number;
  helpText: string;
}

const PLATFORM_META: Record<SharePlatform, PlatformMeta> = {
  instagram: {
    label: 'Instagram',
    charLimit: 2200,
    warnAt: 2000,
    helpText: 'Copy this, then paste it into your Instagram caption.',
  },
  linkedin: {
    label: 'LinkedIn',
    charLimit: 3000,
    warnAt: 2800,
    helpText: 'Opens LinkedIn share with this link attached.',
  },
  x: {
    label: 'X',
    charLimit: 280,
    warnAt: 260,
    helpText: 'Opens an X compose window prefilled with your edit.',
  },
  tiktok: {
    label: 'TikTok',
    charLimit: 2200,
    warnAt: 2000,
    helpText: 'Copy this, then paste into your TikTok caption.',
  },
  generic: {
    label: 'Copy link',
    charLimit: 10_000,
    warnAt: 9_800,
    helpText: 'Use this copy anywhere — group chat, a text, anywhere.',
  },
};

export function ShareCopyCard({
  dealId,
  platform,
  templateId,
  initialCopy,
  shareUrl,
}: ShareCopyCardProps) {
  const meta = PLATFORM_META[platform];
  const [copy, setCopy] = useState<string>(initialCopy);
  const [copiedJustNow, setCopiedJustNow] = useState(false);

  const charCount = copy.length;
  const overLimit = charCount > meta.charLimit;
  const approaching = !overLimit && charCount >= meta.warnAt;

  const counterColor = overLimit
    ? 'text-red-400'
    : approaching
      ? 'text-amber-300'
      : 'text-white/50';

  const postShareEvent = useCallback(
    async (eventPlatform: 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'copy_link') => {
      try {
        await fetch(`/api/hs/deals/${dealId}/share-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: eventPlatform,
            templateId: templateId ?? null,
          }),
        });
      } catch {
        // Analytics failures must never block the share action.
      }
    },
    [dealId, templateId],
  );

  const handleCopy = useCallback(async () => {
    const eventPlatform = 'copy_link' as const;
    // Fire analytics first — don't await in a way that blocks the user
    // if it's slow. We still give it priority because the clipboard action
    // is synchronous on modern browsers.
    void postShareEvent(eventPlatform);
    try {
      await navigator.clipboard.writeText(copy);
      setCopiedJustNow(true);
      window.setTimeout(() => setCopiedJustNow(false), 2000);
    } catch {
      // Older browsers — fall back to no-op, user can select manually.
    }
  }, [copy, postShareEvent]);

  const counterText = useMemo(() => {
    if (platform === 'generic') return `${charCount} characters`;
    return `${charCount} / ${meta.charLimit.toLocaleString()}`;
  }, [charCount, meta.charLimit, platform]);

  const textareaId = `share-copy-${platform}-${dealId}`;

  return (
    <section
      aria-labelledby={`share-card-${platform}-heading`}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm md:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id={`share-card-${platform}-heading`}
          className="font-display text-xl text-white"
        >
          {meta.label}
        </h3>
        <span className={`text-xs font-medium ${counterColor}`}>
          {counterText}
        </span>
      </div>

      <label htmlFor={textareaId} className="mt-1 block text-xs text-white/60">
        Edit the copy however feels true to you.
      </label>

      <textarea
        id={textareaId}
        rows={platform === 'x' ? 4 : 6}
        value={copy}
        onChange={(e) => setCopy(e.target.value)}
        className="mt-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-[var(--accent-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40"
      />

      <p className="mt-2 text-xs text-white/50">{meta.helpText}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
        >
          {copiedJustNow ? 'Copied.' : 'Copy text'}
        </button>

        <ShareButtonStack
          dealId={dealId}
          platform={platform}
          templateId={templateId}
          copy={copy}
          shareUrl={shareUrl}
        />
      </div>
    </section>
  );
}

export default ShareCopyCard;
