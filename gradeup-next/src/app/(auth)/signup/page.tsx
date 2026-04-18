/**
 * Signup landing (Server Component).
 *
 * Reads the FEATURE_HS_NIL flag server-side (it's a server-only env var —
 * not exposed to the client) and passes the boolean down as a prop. The
 * interactive bracket/role picker lives in SignupClient so the flag value
 * is known at first paint, never undefined on the client.
 *
 * Non-regression guarantee: when the flag is OFF, SignupClient receives
 * `hsEnabled={false}` and the BracketPicker short-circuits to `null`. The
 * rendered output is bit-for-bit the same classic role picker that shipped
 * before HS-NIL existed.
 */

import { isFeatureEnabled } from '@/lib/feature-flags';
import { SignupClient } from './signup-client';

export default function SignupPage() {
  const hsEnabled = isFeatureEnabled('HS_NIL');
  return <SignupClient hsEnabled={hsEnabled} />;
}
