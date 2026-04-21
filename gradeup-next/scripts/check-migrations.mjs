#!/usr/bin/env node
/**
 * Migration-ordering sanity check.
 *
 * Scans supabase/migrations and validates:
 *   - No duplicate numeric prefixes at the same era.
 *   - Alphabetical filename order produces monotonic apply order.
 *   - Every file is readable and non-empty.
 *   - Flags common bug patterns (ALTER without guard, seed INSERT
 *     without ON CONFLICT, CREATE TABLE name collisions).
 *
 * Exits 0 when clean, 1 when blocking errors. Output is plain text.
 *
 * Run: node scripts/check-migrations.mjs
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIR = new URL('../supabase/migrations/', import.meta.url).pathname;
const files = readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();

if (files.length === 0) {
  console.error('No migration files found.');
  process.exit(1);
}

const issues = [];
const seenPrefixes = new Map();
const seenTableNames = new Map();
let earlyCount = 0;
let dateCount = 0;

const EARLY_RE = /^(\d{3})_/;
const DATE_RE = /^(\d{8})_(\d{3})_/;
const CREATE_TABLE_RE =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)/gi;
const ALTER_ADD_NOGUARD_RE =
  /ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS)/gi;

for (const file of files) {
  const full = join(DIR, file);
  const s = statSync(full);
  if (s.size === 0) {
    issues.push({ file, level: 'error', msg: 'Empty migration.' });
    continue;
  }

  const d = file.match(DATE_RE);
  const e = file.match(EARLY_RE);

  if (d) {
    dateCount += 1;
    const k = `${d[1]}-${d[2]}`;
    if (seenPrefixes.has(k)) {
      issues.push({
        file,
        level: 'error',
        msg: `Duplicate date-era prefix ${d[1]}_${d[2]} also used by ${seenPrefixes.get(k)}.`,
      });
    } else {
      seenPrefixes.set(k, file);
    }
  } else if (e) {
    earlyCount += 1;
    const k = `early-${e[1]}`;
    if (seenPrefixes.has(k)) {
      issues.push({
        file,
        level: 'warn',
        msg: `Duplicate early-era prefix ${e[1]}_ also used by ${seenPrefixes.get(k)}.`,
      });
    } else {
      seenPrefixes.set(k, file);
    }
  }

  const content = readFileSync(full, 'utf8');

  CREATE_TABLE_RE.lastIndex = 0;
  let m;
  while ((m = CREATE_TABLE_RE.exec(content)) !== null) {
    const name = m[1].toLowerCase();
    if (name === 'temp' || name.startsWith('tmp_')) continue;
    const existing = seenTableNames.get(name);
    if (existing && existing !== file) {
      issues.push({
        file,
        level: 'info',
        msg: `Table '${name}' also referenced by ${existing}.`,
      });
    } else {
      seenTableNames.set(name, file);
    }
  }

  ALTER_ADD_NOGUARD_RE.lastIndex = 0;
  if (ALTER_ADD_NOGUARD_RE.test(content)) {
    issues.push({
      file,
      level: 'info',
      msg: 'ALTER TABLE ADD COLUMN without IF NOT EXISTS guard.',
    });
  }

  const hasInsert = /INSERT\s+INTO/i.test(content);
  const hasOnConflict = /ON\s+CONFLICT/i.test(content);
  if (hasInsert && !hasOnConflict) {
    const seedLikely =
      /INSERT\s+INTO\s+(state_nil_rules|campaign_templates|nurture_sequence_definitions|referral_reward_tiers|regulatory_monitor_sources)/i.test(
        content,
      );
    if (seedLikely) {
      issues.push({
        file,
        level: 'warn',
        msg: 'Seed INSERT without ON CONFLICT. Re-apply may fail.',
      });
    }
  }
}

if (earlyCount > 0 && dateCount > 0) {
  issues.push({
    file: '(global)',
    level: 'info',
    msg: `Directory mixes ${earlyCount} early-era + ${dateCount} date-era files. Lexicographic apply order puts early-era first.`,
  });
}

const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warn');
const infos = issues.filter((i) => i.level === 'info');

console.log(`Scanned ${files.length} migration files.`);
console.log(
  `  ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info.`,
);

if (errors.length > 0) {
  console.log('\nERRORS:');
  for (const i of errors) console.log(`  [${i.file}] ${i.msg}`);
}
if (warnings.length > 0) {
  console.log('\nWARNINGS:');
  for (const i of warnings) console.log(`  [${i.file}] ${i.msg}`);
}
if (infos.length > 0 && process.argv.includes('--verbose')) {
  console.log('\nINFO:');
  for (const i of infos) console.log(`  [${i.file}] ${i.msg}`);
}

if (errors.length > 0) process.exit(1);
process.exit(0);
