'use client';

/**
 * ShareButtonStack — per-platform compose buttons.
 *
 * For each platform button we:
 *   1. POST /api/hs/deals/[id]/share-event BEFORE opening the compose URL.
 *   2. Open the platform's compose URL in a new tab (or copy-to-clipboard
 *      + instruction when the platform has no web compose).
 *
 * Analytics failures NEVER block the share action — this is the whole
 * point of the viral amplifier. If the POST throws, we swallow and
 * proceed.
 *
 * Why these URL formats:
 *   - LinkedIn:  https://www.linkedin.com/sharing/share-offsite/?url=...
 *                LinkedIn's share-offsite endpoint accepts only a URL
 *                parameter and auto-generates preview from the OG tags
 *                on the deal page. Copy is not pre-fillable via URL.
 *   - X:         https://twitter.com/intent/tweet?text=... (truncated to
 *                280 chars in the URL).
 *   - Instagram: No web compose URL. We copy the text to clipboard and
 *                deep-link to instagram.com with a user instruction to
 *                paste into their next post.
 *   - TikTok:    Same story — no compose URL. Copy + deep-link.
 */

import { useCallback, useState } from 'react';
import type { SharePlatform } from '@/lib/hs-nil/share';

export interface ShareButtonStackProps {
  dealId: string;
  platform: SharePlatform;
  templateId: string | null;
  copy: string;
  shareUrl: string;
}

type EventPlatform = 'instagram' | 'linkedin' | 'x' | 'tiktok' | 'copy_link';

function truncateForX(text: string): string {
  const limit = 280;
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}\u2026`;
}

async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older browsers — no-op, user can select manually.
  }
}

export function ShareButtonStack({
  dealId,
  platform,
  templateId,
  copy,
  shareUrl,
}: ShareButtonStackProps) {
  const [justShared, setJustShared] = useState<EventPlatform | null>(null);

  const postShareEvent = useCallback(
    async (eventPlatform: EventPlatform) => {
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
        // Analytics failures must never block the share.
      }
    },
    [dealId, templateId],
  );

  const flashShared = useCallback((ep: EventPlatform) => {
    setJustShared(ep);
    window.setTimeout(() => setJustShared(null), 2400);
  }, []);

  const handleInstagram = useCallback(async () => {
    const eventPlatform: EventPlatform = 'instagram';
    void postShareEvent(eventPlatform);
    await copyToClipboard(copy);
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    flashShared(eventPlatform);
  }, [copy, postShareEvent, flashShared]);

  const handleLinkedIn = useCallback(() => {
    const eventPlatform: EventPlatform = 'linkedin';
    void postShareEvent(eventPlatform);
    const u = new URL('https://www.linkedin.com/sharing/share-offsite/');
    u.searchParams.set('url', shareUrl);
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
    flashShared(eventPlatform);
  }, [shareUrl, postShareEvent, flashShared]);

  const handleX = useCallback(() => {
    const eventPlatform: EventPlatform = 'x';
    void postShareEvent(eventPlatform);
    const u = new URL('https://twitter.com/intent/tweet');
    u.searchParams.set('text', truncateForX(copy));
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
    flashShared(eventPlatform);
  }, [copy, postShareEvent, flashShared]);

  const handleTikTok = useCallback(async () => {
    const eventPlatform: EventPlatform = 'tiktok';
    void postShareEvent(eventPlatform);
    await copyToClipboard(copy);
    window.open('https://www.tiktok.com/', '_blank', 'noopener,noreferrer');
    flashShared(eventPlatform);
  }, [copy, postShareEvent, flashShared]);

  const handleCopyLink = useCallback(async () => {
    const eventPlatform: EventPlatform = 'copy_link';
    void postShareEvent(eventPlatform);
    await copyToClipboard(shareUrl);
    flashShared(eventPlatform);
  }, [shareUrl, postShareEvent, flashShared]);

  const btnBase =
    'inline-flex min-h-[40px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50';

  // Each ShareCopyCard renders a SINGLE platform's block. The button set
  // shown depends on which platform the card is bound to.
  if (platform === 'instagram') {
    return (
      <ShareFeedback eventPlatform="instagram" justShared={justShared}>
        <button
          type="button"
          onClick={handleInstagram}
          className={`${btnBase} bg-[#E1306C] text-white`}
        >
          Copy & open Instagram
        </button>
      </ShareFeedback>
    );
  }

  if (platform === 'linkedin') {
    return (
      <ShareFeedback eventPlatform="linkedin" justShared={justShared}>
        <button
          type="button"
          onClick={handleLinkedIn}
          className={`${btnBase} bg-[#0A66C2] text-white`}
        >
          Share to LinkedIn
        </button>
      </ShareFeedback>
    );
  }

  if (platform === 'x') {
    return (
      <ShareFeedback eventPlatform="x" justShared={justShared}>
        <button
          type="button"
          onClick={handleX}
          className={`${btnBase} bg-black text-white`}
        >
          Post to X
        </button>
      </ShareFeedback>
    );
  }

  if (platform === 'tiktok') {
    return (
      <ShareFeedback eventPlatform="tiktok" justShared={justShared}>
        <button
          type="button"
          onClick={handleTikTok}
          className={`${btnBase} bg-black text-white`}
        >
          Copy & open TikTok
        </button>
      </ShareFeedback>
    );
  }

  // generic — just a copy-link button.
  return (
    <ShareFeedback eventPlatform="copy_link" justShared={justShared}>
      <button
        type="button"
        onClick={handleCopyLink}
        className={`${btnBase} bg-white text-black`}
      >
        Copy share link
      </button>
    </ShareFeedback>
  );
}

function ShareFeedback({
  eventPlatform,
  justShared,
  children,
}: {
  eventPlatform: EventPlatform;
  justShared: EventPlatform | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3" role="status" aria-live="polite">
      {children}
      {justShared === eventPlatform ? (
        <span className="text-xs font-medium text-emerald-300">Shared.</span>
      ) : null}
    </div>
  );
}

export default ShareButtonStack;
