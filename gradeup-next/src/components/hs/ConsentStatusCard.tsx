/**
 * ConsentStatusCard — minor athlete's view of parental consent state.
 *
 * Three variants, resolved by the parent page based on the DB:
 *   - "active"  : athlete has an unexpired, non-revoked parental_consents row.
 *   - "pending" : athlete has one or more non-consumed pending_consents rows.
 *   - "none"    : neither exists.
 *
 * This component is only rendered for minors; adults don't need it and the
 * parent page short-circuits.
 */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { OnboardingCard } from './OnboardingCard';

export type ConsentStatusVariant = 'active' | 'pending' | 'none';

interface ActiveProps {
  variant: 'active';
  parentName: string;
  scopeSummary: string;
  manageHref?: string;
}

interface PendingProps {
  variant: 'pending';
  parentName?: string | null;
  parentEmail: string;
  /** Number of total pending requests (≥1). */
  pendingCount: number;
  requestHref?: string;
}

interface NoneProps {
  variant: 'none';
  requestHref?: string;
}

export type ConsentStatusCardProps = ActiveProps | PendingProps | NoneProps;

export function ConsentStatusCard(props: ConsentStatusCardProps) {
  if (props.variant === 'active') {
    const manage = props.manageHref ?? '/hs/consent/manage';
    return (
      <OnboardingCard
        eyebrow="Parental consent"
        title="You're cleared to sign deals."
        description={`${props.parentName} approved ${props.scopeSummary}.`}
      >
        <Link href={manage} className="inline-block">
          <Button size="lg" variant="outline">
            Manage consent
          </Button>
        </Link>
      </OnboardingCard>
    );
  }

  if (props.variant === 'pending') {
    const requestHref = props.requestHref ?? '/hs/consent/manage';
    const whose = props.parentName?.trim()
      ? props.parentName
      : props.parentEmail;
    return (
      <OnboardingCard
        eyebrow="Parental consent"
        accent
        title={`Waiting on ${whose} to sign.`}
        description={
          props.pendingCount > 1
            ? `${props.pendingCount} consent requests are out. They expire in 7 days if unsigned.`
            : 'They got an email with a secure link. It expires in 7 days.'
        }
      >
        <div className="flex flex-wrap gap-3">
          <Link href={requestHref} className="inline-block">
            <Button size="lg" variant="outline">
              See request details
            </Button>
          </Link>
          <Link href="/hs/consent/request" className="inline-block">
            <Button size="lg" variant="primary">
              Resend email
            </Button>
          </Link>
        </div>
      </OnboardingCard>
    );
  }

  const requestHref = props.requestHref ?? '/hs/consent/request';
  return (
    <OnboardingCard
      eyebrow="Parental consent"
      accent
      title="No parental consent on file."
      description="A parent or legal guardian has to co-sign before any NIL deal can go live. Takes about 5 minutes on their end."
    >
      <Link href={requestHref} className="inline-block">
        <Button size="lg" variant="primary">
          Request consent
        </Button>
      </Link>
    </OnboardingCard>
  );
}

export default ConsentStatusCard;
