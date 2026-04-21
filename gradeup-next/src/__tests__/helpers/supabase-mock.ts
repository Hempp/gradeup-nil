/**
 * Lightweight Supabase client mock for unit tests.
 *
 * Contract:
 *   - Factory takes Record<string, any> where keys are "tableName:primaryKey" → row data.
 *   - Supports the narrow subset of the Supabase fluent API used by getProfile:
 *       .from(table).select(...).eq(...).maybeSingle()          → { data, error }
 *       .from(table).select(...).eq(...).is(col, null)
 *              .maybeSingle()                                   → { data, error }
 *       .from(table).select(..., { count: 'exact', head: true })
 *              .eq(...)                                         → { count, error }
 *       .from(table).select(...).eq(...)                        → { data: row[], error }
 *
 * Keys are matched by the first .eq() call's value. This is intentionally
 * minimal — add methods only when new tests require them.
 */

type RowStore = Record<string, unknown>;

interface MockResult {
  data: unknown;
  error: null | { message: string };
  count?: number | null;
}

function makeChain(
  rows: unknown[], // 0 or 1 rows already filtered by primary .eq()
  opts: { countOnly?: boolean; filterNulls?: Array<string> }
): Record<string, unknown> {
  // Apply .is(col, null) style filters (deactivated_at IS NULL)
  const applyNullFilters = (data: unknown[]): unknown[] => {
    if (!opts.filterNulls || opts.filterNulls.length === 0) return data;
    return data.filter((row) => {
      for (const col of opts.filterNulls!) {
        if ((row as Record<string, unknown>)[col] !== null &&
            (row as Record<string, unknown>)[col] !== undefined) {
          return false;
        }
      }
      return true;
    });
  };

  const chain = {
    // .is(col, value) — only null-checking supported for now
    is(col: string, value: unknown) {
      if (value === null) {
        opts.filterNulls = [...(opts.filterNulls ?? []), col];
      }
      return chain;
    },
    // .eq() chained after .is() or another .eq() — ignored (primary eq already applied)
    eq(_col: string, _val: unknown) {
      return chain;
    },
    async maybeSingle(): Promise<MockResult> {
      const filtered = applyNullFilters(rows);
      return { data: filtered[0] ?? null, error: null };
    },
    // Awaiting the chain directly resolves to an array result
    then(
      resolve: (v: MockResult) => void,
      _reject?: (e: unknown) => void
    ) {
      const filtered = applyNullFilters(rows);
      if (opts.countOnly) {
        resolve({ data: null, error: null, count: filtered.length });
      } else {
        resolve({ data: filtered, error: null });
      }
    },
  };
  return chain;
}

/**
 * Minimal Supabase client mock for profile/context tests.
 *
 * Keying convention: `{tableName}:{firstEqValue}` — when production code
 * calls `.from(tableName).eq('someColumn', someValue)`, the mock looks up
 * the key `tableName:someValue`. The column name is ignored.
 *
 * IMPORTANT: If a query uses `.eq()` with a value that is NOT `userId`
 * (e.g., brand's `.eq('brand_id', brand.id)` on `hs_brand_campaigns`),
 * seed the mock with that value in the key:
 *   { 'hs_brand_campaigns:b1': [...] }  // b1 is brand.id, NOT userId
 *
 * The store value may be a single row object or an array of row objects.
 * Arrays are spread into the row list (not wrapped), so a count query over
 * `[{id:'c1'},{id:'c2'}]` correctly returns `count: 2`.
 *
 * The mock returns `{ data, error: null }` for `.maybeSingle()`,
 * `{ data: row[], error: null }` for multi-row select (returns array), and
 * `{ count, error: null }` for `{ count: 'exact', head: true }`.
 *
 * Not intended to be a complete Supabase mock — only enough for these tests.
 */
export function makeSupabaseMock(store: RowStore) {
  return {
    from(table: string) {
      return {
        select(_cols: string, selectOpts?: { count?: string; head?: boolean }) {
          const countOnly = !!(selectOpts?.count && selectOpts?.head);

          return {
            eq(col: string, value: unknown) {
              // Find matching rows: "tableName:value" lookup for any column
              const key = `${table}:${value}`;
              const rawRow = store[key];
              // If the stored value is already an array, spread it as multiple rows.
              // This ensures count queries over multi-row seeds return the correct count.
              const rows: unknown[] =
                rawRow === undefined
                  ? []
                  : Array.isArray(rawRow)
                    ? rawRow
                    : [rawRow];
              return makeChain(rows, { countOnly });
            },
          };
        },
      };
    },
  };
}
