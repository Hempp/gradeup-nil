#!/usr/bin/env node
/**
 * Pre-deploy environment-variable preflight.
 *
 * Scans src/ and scripts/ for every process.env.X reference, classifies each
 * by deploy tier (critical | concierge | scale | optional), and reports
 * present/missing status against .env.local + .env + process.env.
 *
 * Never prints secret values. Never loads the dotenv npm package. Node
 * standard library only (node:fs, node:path, node:url).
 *
 * Flags:
 *   --tier=critical|concierge|scale|optional   Filter output to one tier.
 *   --target=preview|prod                      Context-sensitive messaging.
 *
 * Exit codes:
 *   0  All critical present (other tiers may still warn).
 *   1  Any critical missing, OR --tier=concierge and any concierge missing,
 *      OR --target=prod and any concierge missing.
 *
 * Run: node scripts/preflight-env.mjs [--tier=X] [--target=prod]
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

// ---------- CLI flags ----------

const args = process.argv.slice(2);
const getFlag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : null;
};
const tierFilter = getFlag('tier');
const target = getFlag('target') || 'preview';

const VALID_TIERS = ['critical', 'concierge', 'scale', 'optional'];
if (tierFilter && !VALID_TIERS.includes(tierFilter)) {
  console.error(`Invalid --tier=${tierFilter}. Use: ${VALID_TIERS.join('|')}.`);
  process.exit(1);
}
if (!['preview', 'prod'].includes(target)) {
  console.error(`Invalid --target=${target}. Use: preview|prod.`);
  process.exit(1);
}

// ---------- Static registry: tier + hint per known var ----------
// Tier meaning:
//   critical  — app won't boot without it.
//   concierge — needed for the 5-parent concierge with real users.
//   scale     — specific features; not required day-1.
//   optional  — defaults exist; missing is fine.

const REGISTRY = {
  // Core
  NEXT_PUBLIC_SUPABASE_URL: {
    tier: 'critical',
    hint: 'Supabase project URL. Without it, every client and server supabase call fails.',
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    tier: 'critical',
    hint: 'Supabase anon/public key. Required for browser auth and RLS-scoped reads.',
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    tier: 'critical',
    hint: 'Supabase service-role key. Required by server routes, webhooks, cron jobs.',
  },
  NEXT_PUBLIC_APP_URL: {
    tier: 'critical',
    hint: 'Canonical app URL. Used for OG tags, email links, Stripe return URLs.',
  },
  NEXT_PUBLIC_SITE_URL: {
    tier: 'concierge',
    hint: 'Public site URL for sitemap + canonical. Falls back to APP_URL if absent.',
  },

  // HS-NIL gate
  FEATURE_HS_NIL: {
    tier: 'concierge',
    hint: 'Feature flag for HS-NIL routes. Unset = HS-NIL surfaces stay dark in prod.',
  },

  // Email (Resend)
  RESEND_API_KEY: {
    tier: 'concierge',
    hint: 'Resend API key. Without it, verification + operator notifications go nowhere.',
  },
  EMAIL_FROM_ADDRESS: {
    tier: 'concierge',
    hint: 'Default "from" address for transactional mail. Required by Resend send().',
  },
  EMAIL_FROM_NAME: {
    tier: 'optional',
    hint: 'Display name on outgoing mail. Falls back to a safe default.',
  },
  EMAIL_SUPPORT_ADDRESS: {
    tier: 'concierge',
    hint: 'Support inbox quoted in user-facing emails. Concierge replies land here.',
  },
  EMAIL_OPS_ADDRESS: {
    tier: 'concierge',
    hint: 'Ops inbox for internal alerts (new signup, payout failed, review needed).',
  },

  // Stripe
  STRIPE_SECRET_KEY: {
    tier: 'concierge',
    hint: 'Stripe secret. Required for any checkout, Connect onboarding, or payout call.',
  },
  STRIPE_WEBHOOK_SECRET: {
    tier: 'concierge',
    hint: 'Stripe primary webhook signing secret. Without it, webhooks 401.',
  },
  STRIPE_CONNECT_WEBHOOK_SECRET: {
    tier: 'concierge',
    hint: 'Stripe Connect webhook secret (account.updated, capability.updated).',
  },
  STRIPE_HS_PAYMENTS_WEBHOOK_SECRET: {
    tier: 'scale',
    hint: 'Dedicated HS-payments webhook secret. Optional if sharing primary webhook.',
  },
  STRIPE_PLATFORM_WEBHOOK_SECRET: {
    tier: 'scale',
    hint: 'Dedicated platform-level webhook secret. Optional if sharing primary.',
  },
  HS_PAYOUT_PROVIDER: {
    tier: 'concierge',
    hint: 'Payout provider switch ("stripe" | "trust"). Unset = payout route rejects.',
  },

  // Rate limiting
  UPSTASH_REDIS_REST_URL: {
    tier: 'scale',
    hint: 'Upstash Redis REST URL. Missing = rate-limit middleware falls back to allow-all.',
  },
  UPSTASH_REDIS_REST_TOKEN: {
    tier: 'scale',
    hint: 'Upstash Redis REST token. Pairs with the URL; one without the other is a bug.',
  },

  // OCR
  OCR_PROVIDER: {
    tier: 'scale',
    hint: 'OCR provider switch ("openai" | "google"). Transcript upload flow uses this.',
  },
  OPENAI_API_KEY: {
    tier: 'scale',
    hint: 'OpenAI key for transcript OCR when OCR_PROVIDER=openai.',
  },
  OPENAI_VISION_MODEL: {
    tier: 'optional',
    hint: 'OpenAI vision model override. Defaults to a safe current model.',
  },
  GOOGLE_VISION_SERVICE_KEY: {
    tier: 'scale',
    hint: 'Google Vision service-account JSON when OCR_PROVIDER=google.',
  },

  // SMS
  SMS_PROVIDER: {
    tier: 'scale',
    hint: 'SMS provider switch ("twilio"). Unset = SMS routes return 501.',
  },
  TWILIO_ACCOUNT_SID: {
    tier: 'scale',
    hint: 'Twilio account SID. Required when SMS_PROVIDER=twilio.',
  },
  TWILIO_AUTH_TOKEN: {
    tier: 'scale',
    hint: 'Twilio auth token. Required when SMS_PROVIDER=twilio.',
  },
  TWILIO_FROM_PHONE: {
    tier: 'scale',
    hint: 'Twilio sender phone (E.164). Required when SMS_PROVIDER=twilio.',
  },

  // Push
  VAPID_PUBLIC_KEY: {
    tier: 'scale',
    hint: 'Web Push VAPID public key. Missing = push subscribe endpoint rejects.',
  },
  VAPID_PRIVATE_KEY: {
    tier: 'scale',
    hint: 'Web Push VAPID private key. Pairs with public key; one without the other = broken.',
  },
  VAPID_SUBJECT: {
    tier: 'scale',
    hint: 'VAPID subject (mailto:... or site URL). Required by web-push when pushing.',
  },

  // Cron
  CRON_SECRET: {
    tier: 'concierge',
    hint: 'Shared secret for Vercel cron handlers. Missing = cron routes 401 from Vercel.',
  },

  // Admin / routing
  HS_NIL_ADMIN_ALERT_ADDRESS: {
    tier: 'concierge',
    hint: 'Inbox for HS-NIL admin alerts (consent breaks, guardian disputes, KYC flags).',
  },
  HS_NIL_IP_HASH_SALT: {
    tier: 'optional',
    hint: 'Salt for hashing consent IPs. A default exists; override in prod for privacy.',
  },
  VALUATION_IP_HASH_SALT: {
    tier: 'optional',
    hint: 'Salt for hashing valuation-request IPs. Default exists; override in prod.',
  },
};

// ---------- Scan src/ + scripts/ for process.env references ----------

// Require 2+ chars so docblock placeholders like `process.env.X` are ignored.
const ENV_RE = /process\.env\.([A-Z_][A-Z0-9_]+)/g;
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  'coverage',
  'out',
  'test-results',
  'playwright-report',
]);
const FILE_EXT = /\.(ts|tsx|mjs|js|cjs)$/;

function walk(dir, collected) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, collected);
    } else if (e.isFile() && FILE_EXT.test(e.name)) {
      collected.push(full);
    }
  }
}

const files = [];
walk(join(ROOT, 'src'), files);
walk(join(ROOT, 'scripts'), files);

const discovered = new Set();
for (const f of files) {
  let content;
  try {
    content = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  ENV_RE.lastIndex = 0;
  let m;
  while ((m = ENV_RE.exec(content)) !== null) {
    discovered.add(m[1]);
  }
}

// Vars to treat as framework-provided and skip from the report.
const IGNORE = new Set(['NODE_ENV']);
for (const v of IGNORE) discovered.delete(v);

// ---------- Load .env.local + .env without dotenv ----------

function parseDotenv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue;
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const envSources = [];
function loadEnvFile(name) {
  const p = join(ROOT, name);
  if (!existsSync(p)) return null;
  try {
    const s = statSync(p);
    if (!s.isFile()) return null;
  } catch {
    return null;
  }
  try {
    return parseDotenv(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

const envLocal = loadEnvFile('.env.local');
const envBase = loadEnvFile('.env');
if (envLocal) envSources.push('.env.local');
if (envBase) envSources.push('.env');

// Resolution order: process.env > .env.local > .env
function resolve(key) {
  if (process.env[key] != null && process.env[key] !== '') return 'process.env';
  if (envLocal && envLocal[key] != null && envLocal[key] !== '') return '.env.local';
  if (envBase && envBase[key] != null && envBase[key] !== '') return '.env';
  return null;
}

function isSecretName(name) {
  return /(KEY|SECRET|TOKEN|PASSWORD|SALT)/i.test(name);
}

// ---------- Build the report rows ----------

const allVars = new Set([...Object.keys(REGISTRY), ...discovered]);

const rows = [];
for (const name of allVars) {
  const known = REGISTRY[name];
  const inRegistry = !!known;
  const tier = inRegistry ? known.tier : 'optional';
  const hint = inRegistry
    ? known.hint
    : 'Referenced in code but not in the preflight registry. Review whether it belongs to a tier.';
  const source = resolve(name);
  rows.push({
    name,
    tier,
    hint,
    present: source != null,
    source,
    secret: isSecretName(name),
    inRegistry,
    referencedInCode: discovered.has(name),
  });
}

rows.sort((a, b) => a.name.localeCompare(b.name));

const TIER_ORDER = ['critical', 'concierge', 'scale', 'optional'];
const TIER_LABEL = {
  critical: "CRITICAL (platform won't boot)",
  concierge: 'CONCIERGE (required for 5-parent pilot)',
  scale: 'SCALE (needed for specific features)',
  optional: 'OPTIONAL (defaults exist)',
};

// ---------- Print ----------

console.log(`Preflight env scan — target=${target}`);
console.log(
  `  Sources: ${envSources.length ? envSources.join(', ') : 'process.env only (no .env files found)'}`,
);
console.log(
  `  Scanned ${files.length} source files. Discovered ${discovered.size} distinct process.env.* references.`,
);
if (tierFilter) console.log(`  Filter: --tier=${tierFilter}`);
console.log('');

const summary = {};
for (const t of TIER_ORDER) {
  const tierRows = rows.filter((r) => r.tier === t);
  summary[t] = {
    total: tierRows.length,
    present: tierRows.filter((r) => r.present).length,
    missing: tierRows.filter((r) => !r.present).length,
  };
}

console.log('Totals per tier (present / total):');
for (const t of TIER_ORDER) {
  const s = summary[t];
  console.log(
    `  ${t.padEnd(10)} ${String(s.present).padStart(2)} / ${String(s.total).padEnd(2)}  (missing: ${s.missing})`,
  );
}
console.log('');

for (const t of TIER_ORDER) {
  if (tierFilter && tierFilter !== t) continue;
  const tierRows = rows.filter((r) => r.tier === t);
  if (tierRows.length === 0) continue;

  console.log(`== ${TIER_LABEL[t]} ==`);
  for (const r of tierRows) {
    const status = r.present ? 'OK  ' : 'MISS';
    const src = r.present ? ` [${r.source}]` : '';
    const extra = !r.inRegistry ? ' (unregistered)' : '';
    console.log(`  [${status}] ${r.name}${src}${extra}`);
    console.log(`         ${r.hint}`);
  }
  console.log('');
}

// ---------- Exit verdict ----------

const criticalMissing = rows.filter((r) => r.tier === 'critical' && !r.present);
const conciergeMissing = rows.filter((r) => r.tier === 'concierge' && !r.present);
const scaleMissing = rows.filter((r) => r.tier === 'scale' && !r.present);

if (criticalMissing.length > 0) {
  console.log('RESULT: critical vars missing. Deploy will fail on boot.');
  console.log(`  Missing: ${criticalMissing.map((r) => r.name).join(', ')}`);
  console.log('  -> Set the missing critical vars, then re-run.');
  process.exit(1);
}

if (target === 'prod' && conciergeMissing.length > 0) {
  console.log('RESULT: critical OK, but concierge vars missing for target=prod.');
  console.log(
    `  -> Concierge cannot run in prod. Missing: ${conciergeMissing.map((r) => r.name).join(', ')}.`,
  );
  process.exit(1);
}

if (tierFilter === 'concierge' && conciergeMissing.length > 0) {
  console.log('RESULT: --tier=concierge and concierge vars missing.');
  console.log(`  Missing: ${conciergeMissing.map((r) => r.name).join(', ')}`);
  process.exit(1);
}

if (conciergeMissing.length > 0) {
  console.log('RESULT: critical OK. Concierge vars missing (non-blocking for preview):');
  console.log(`  Missing: ${conciergeMissing.map((r) => r.name).join(', ')}`);
}
if (scaleMissing.length > 0) {
  console.log(
    `INFO: scale-tier vars not set (${scaleMissing.length}). Features gated on them will no-op.`,
  );
}

console.log('');
console.log('  -> Ready for `node scripts/check-migrations.mjs`.');
process.exit(0);
