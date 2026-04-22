/**
 * /hs/settings/notifications
 *
 * Server Component. Surfaces:
 *   - the PushSubscribeButton (capability + permission state on client);
 *   - per-type preference toggles (client island);
 *   - the list of active subscriptions for this user.
 */

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PushSubscribeButton } from '@/components/pwa/PushSubscribeButton';
import { PreferenceListClient } from './PreferenceListClient';

export const metadata: Metadata = {
  title: 'Notifications — GradeUp HS',
  description:
    'Turn push notifications on or off for consent requests, deal reviews, and completed payouts.',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface SubscriptionRow {
  id: string;
  user_agent: string | null;
  platform: string;
  created_at: string;
  last_notified_at: string | null;
}

const DEFAULT_PREFS = {
  consent_requests: true,
  deal_review: true,
  deal_completed: true,
  referral_milestones: true,
  updated_at: null as string | null,
};

function formatUserAgent(ua: string | null): string {
  if (!ua) return 'This browser';
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iPhone or iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac OS X/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other device';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default async function NotificationsSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/hs/settings/notifications');
  }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, user_agent, platform, created_at, last_notified_at')
    .eq('user_id', user.id)
    .is('disabled_at', null)
    .order('created_at', { ascending: false });

  const { data: prefRow } = await supabase
    .from('push_preferences')
    .select(
      'consent_requests, deal_review, deal_completed, referral_milestones, updated_at'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  const preferences = prefRow ?? DEFAULT_PREFS;
  const subs = (subscriptions ?? []) as SubscriptionRow[];

  return (
    <main className="min-h-screen bg-[var(--marketing-gray-900)] text-white">
      <section className="mx-auto max-w-3xl px-6 pt-12 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
          Settings
        </p>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">
          Notifications
        </h1>
        <p className="mt-4 text-base text-white/70">
          High-signal alerts only. Consent requests, brand reviews, and completed
          deals. No marketing, no spam.
        </p>

        <div className="mt-10 space-y-10">
          <section>
            <h2 className="font-display text-2xl">This device</h2>
            <p className="mt-2 text-sm text-white/60">
              Turn on push on the device you actually use. Each browser needs its
              own subscription.
            </p>
            <div className="mt-4">
              <PushSubscribeButton />
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">What to notify me about</h2>
            <p className="mt-2 text-sm text-white/60">
              Fine-tune the signal. Defaults are all on — narrow anytime.
            </p>
            <PreferenceListClient initial={preferences} />
          </section>

          <section>
            <h2 className="font-display text-2xl">Active devices</h2>
            <p className="mt-2 text-sm text-white/60">
              Each browser or home-screen install counts as its own device.
            </p>
            {subs.length === 0 ? (
              <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                No active subscriptions yet. Turn on notifications above to add
                this device.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {subs.map((sub) => (
                  <li
                    key={sub.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {formatUserAgent(sub.user_agent)}
                        </p>
                        <p className="text-xs text-white/50">
                          {sub.platform} · added {formatDate(sub.created_at)}
                        </p>
                      </div>
                      <p className="text-xs text-white/40">
                        Last notified: {formatDate(sub.last_notified_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
