/**
 * NCAARecruitingNoticeCard
 *
 * Scaffolding card for the /hs/athlete/transition page. Explains that a
 * recruiting-office-visible view of the athlete's GradeUp HS trajectory
 * is on the roadmap, and previews what that integration will include.
 *
 * Pure presentational server component — no client state.
 */

export default function NCAARecruitingNoticeCard() {
  return (
    <section
      aria-labelledby="recruiting-notice-heading"
      className="rounded-xl border border-white/10 bg-white/5 p-6 text-white"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent-primary)]">
        Coming soon
      </p>
      <h2
        id="recruiting-notice-heading"
        className="mt-2 font-display text-2xl md:text-3xl"
      >
        Recruiting office integration
      </h2>
      <p className="mt-3 text-sm text-white/80">
        Your GradeUp HS trajectory — verified GPA, sport history, state-rule
        compliance, and deal-readiness signals — is the kind of thing D1
        recruiting offices want to see. We&apos;re working on direct
        integration so your coaches and athletic departments can surface
        your story without you having to re-upload anything.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-white/75">
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
          <span>Recruiting office onboarding (coach + AD accounts).</span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
          <span>
            Recruit search — filter by GPA tier, sport, state, and deal
            readiness without exposing athletes who haven&apos;t opted in.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
          <span>
            Automated enrollment verification via NSC Clearinghouse and
            Parchment — no more manual proof uploads when a feed is
            available.
          </span>
        </li>
      </ul>
      <p className="mt-4 text-xs text-white/50">
        Have a recruiting office that wants in early? Reply to any of our
        emails and we&apos;ll plug you in.
      </p>
    </section>
  );
}
