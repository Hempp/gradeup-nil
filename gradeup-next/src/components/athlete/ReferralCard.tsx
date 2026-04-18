'use client';

import { useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Gift, Copy, Check, Share2, Users, DollarSign } from 'lucide-react';
import { useToastActions } from '@/components/ui/toast';
import { generateReferralCode, REFERRER_BONUS_CENTS, REFEREE_BONUS_CENTS } from '@/lib/services/referrals';

// ═══════════════════════════════════════════════════════════════════════════
// REFERRAL CARD — Athlete Dashboard Widget
// Shows referral code, share link, and referral stats
// ═══════════════════════════════════════════════════════════════════════════

interface ReferralCardProps {
  athleteId: string;
  firstName: string;
  totalReferrals?: number;
  totalEarned?: number;
  className?: string;
}

export function ReferralCard({
  firstName,
  totalReferrals = 0,
  totalEarned = 0,
  className,
}: ReferralCardProps) {
  const toast = useToastActions();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate consistent referral code from first name
  const referralCode = generateReferralCode(firstName);
  const referralUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/signup/athlete?ref=${referralCode}`
    : `/signup/athlete?ref=${referralCode}`;

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Copied!', 'Referral code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Copy Failed', 'Unable to copy to clipboard');
    }
  }, [referralCode, toast]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      toast.success('Copied!', 'Referral link copied to clipboard');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error('Copy Failed', 'Unable to copy to clipboard');
    }
  }, [referralUrl, toast]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join GradeUp NIL',
          text: `Use my referral code ${referralCode} to sign up for GradeUp and get $${(REFEREE_BONUS_CENTS / 100).toFixed(0)} bonus on your first deal!`,
          url: referralUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyLink();
    }
  }, [referralCode, referralUrl, handleCopyLink]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Gradient top border */}
      <div className="h-1 bg-gradient-to-r from-[var(--accent-primary)] via-[var(--accent-success)] to-[var(--accent-gold)]" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-5 w-5 text-[var(--accent-primary)]" />
            Invite Athletes, Earn Cash
          </CardTitle>
          <Badge variant="success" className="text-xs">
            ${(REFERRER_BONUS_CENTS / 100).toFixed(0)} per referral
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* How it works */}
        <p className="text-sm text-[var(--text-muted)]">
          Share your code with fellow athletes. You earn ${(REFERRER_BONUS_CENTS / 100).toFixed(0)} and they get ${(REFEREE_BONUS_CENTS / 100).toFixed(0)} when they complete their first deal.
        </p>

        {/* Referral Code */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-11 px-4 flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] font-mono text-sm font-bold text-[var(--text-primary)] tracking-wider">
            {referralCode}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="h-11 px-3 gap-1.5"
            aria-label="Copy referral code"
          >
            {copied ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {/* Share Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="flex-1 gap-1.5"
          >
            {copiedLink ? <Check className="h-4 w-4 text-[var(--color-success)]" /> : <Copy className="h-4 w-4" />}
            {copiedLink ? 'Link Copied!' : 'Copy Link'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleShare}
            className="flex-1 gap-1.5"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--bg-tertiary)]">
            <Users className="h-4 w-4 text-[var(--accent-primary)]" />
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">{totalReferrals}</p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Referrals</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--bg-tertiary)]">
            <DollarSign className="h-4 w-4 text-[var(--accent-success)]" />
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                ${(totalEarned / 100).toFixed(0)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] uppercase">Earned</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
