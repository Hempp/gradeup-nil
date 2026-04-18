/**
 * Feature flag gate system.
 *
 * Flags are read from environment variables at module load. Server-side only
 * by default — pass the flag value into Client Components via props.
 *
 * To expose a flag to client code: prefix with NEXT_PUBLIC_FEATURE_ and add to
 * the PUBLIC_FLAGS map below. Runtime per-user targeting is out of scope here;
 * graduate to a hosted provider (GrowthBook, Statsig) when we need it.
 */

export const FEATURE_FLAGS = {
  HS_NIL: process.env.FEATURE_HS_NIL === 'true',
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlagName): boolean {
  return FEATURE_FLAGS[flag] === true;
}

export function requireFeature(flag: FeatureFlagName): void {
  if (!isFeatureEnabled(flag)) {
    const err = new Error(`Feature ${flag} is disabled`) as Error & {
      statusCode?: number;
    };
    err.statusCode = 404;
    throw err;
  }
}
