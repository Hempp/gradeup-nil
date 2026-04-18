/**
 * CelebrationHero — /hs/deals/[id]/celebrate
 *
 * Server-safe (no client state). Renders the headline + payout card for
 * the share-the-win page. Keeps the composition simple so parents see the
 * name, the brand, and the amount at a glance — the social share copy is
 * the rest of the page.
 */

interface CelebrationHeroProps {
  athleteFirstName: string;
  brandName: string;
  amount: number;
  schoolName: string | null;
}

function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export function CelebrationHero({
  athleteFirstName,
  brandName,
  amount,
  schoolName,
}: CelebrationHeroProps) {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-20 pb-10 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
        Fully signed
      </p>
      <h1 className="mt-4 font-display text-5xl leading-none md:text-7xl">
        You did it.
      </h1>
      <p className="mt-6 font-display text-2xl text-white/90 md:text-3xl">
        {athleteFirstName}{' '}
        <span className="text-white/40">&times;</span> {brandName}
      </p>
      {schoolName ? (
        <p className="mt-2 text-sm text-white/60">{schoolName}</p>
      ) : null}

      <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Payout
        </p>
        <p className="mt-2 font-display text-5xl text-white">
          {formatCurrency(amount)}
        </p>
        <p className="mt-1 text-xs text-white/50">
          Routed to the account on file
        </p>
      </div>
    </section>
  );
}

export default CelebrationHero;
