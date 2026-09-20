"use client";

import type { Plan, PlanSettings } from "@/lib/types";

/**
 * localStorage wrapper. Browser-only persistence by design (PRD §12.4) — this
 * module is deliberately the single place that touches storage, so swapping in
 * a shared database later means changing this file and nothing else.
 *
 * Every access is wrapped: private windows, blocked site data and quota errors
 * all throw, and none of them should take the app down.
 */

const KEY = "jm-food:v1";
const SCHEMA_VERSION = 4;

interface Stored {
  version: number;
  plan: Plan | null;
  settings: PlanSettings | null;
  /** Allergens the twins have already been offered — for first-exposure marking. */
  allergensSeen: string[];
  /** Meals marked as eaten, as "dayIndex:slot". */
  eaten: string[];
  /** Shopping lines ticked off, as "shopIndex:item". */
  ticked: string[];
  /** Recipe ids saved to the cook-from list. */
  saved: string[];
  /** The parent's own note against a recipe, keyed by recipe id. */
  notes: Record<string, string>;
  /** Prep-day recipes already cooked, as "sessionIndex:recipeId". */
  cooked: string[];
  /** Where you were on the Shop tab, so a locked phone does not lose your place. */
  shop: { listIndex: number; hideStaples: boolean };
  /**
   * What actually happened at the shop, keyed by canonical ingredient name:
   * "haddock" -> "pollock instead", "tarragon" -> "Out of stock". Written in
   * the aisle, read at the hob — which is the whole point of writing it down.
   */
  swaps: Record<string, string>;
}

const EMPTY: Stored = {
  version: SCHEMA_VERSION,
  plan: null,
  settings: null,
  allergensSeen: [],
  eaten: [],
  ticked: [],
  saved: [],
  notes: {},
  cooked: [],
  shop: { listIndex: 0, hideStaples: true },
  swaps: {},
};

/**
 * v1 settings counted in whole weeks. Rather than throw a saved plan away —
 * which loses the shopping ticks and the allergen record with it — the week
 * count is carried across as a coverage target expressed in weeks, which is
 * exactly what it meant.
 */
function migrate(parsed: Record<string, unknown>): Stored {
  const version = typeof parsed.version === "number" ? parsed.version : 0;
  if (version === SCHEMA_VERSION) return { ...EMPTY, ...(parsed as unknown as Stored) };
  // v2 added saved recipes and notes, v3 prep ticks and shop position, v4 the
  // shopping substitutions. All additive, so EMPTY's defaults are the whole
  // migration and nothing a parent has recorded is ever thrown away.
  if (version === 2 || version === 3) {
    return { ...EMPTY, ...(parsed as unknown as Stored), version: SCHEMA_VERSION };
  }
  if (version !== 1) return EMPTY;

  const withCoverage = (s: unknown): PlanSettings | null => {
    if (!s || typeof s !== "object") return null;
    const settings = { ...(s as PlanSettings & { weeks?: number }) };
    if (!settings.coverage) {
      settings.coverage = { mode: "weeks", value: Math.max(1, settings.weeks ?? 2) };
    }
    delete settings.weeks;
    return settings;
  };

  const plan = (parsed.plan as Plan | null) ?? null;
  const migratedPlan =
    plan && plan.settings ? { ...plan, settings: withCoverage(plan.settings)! } : null;

  return {
    ...EMPTY,
    ...(parsed as unknown as Stored),
    version: SCHEMA_VERSION,
    plan: migratedPlan,
    settings: withCoverage(parsed.settings),
    saved: [],
    notes: {},
  };
}

export function load(): Stored {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const migrated = migrate(parsed);
    // Guard against a half-written or hand-edited blob: every field the app
    // reads must be the shape it expects, or the app crashes on load.
    return {
      ...EMPTY,
      ...migrated,
      allergensSeen: Array.isArray(migrated.allergensSeen) ? migrated.allergensSeen : [],
      eaten: Array.isArray(migrated.eaten) ? migrated.eaten : [],
      ticked: Array.isArray(migrated.ticked) ? migrated.ticked : [],
      saved: Array.isArray(migrated.saved) ? migrated.saved : [],
      cooked: Array.isArray(migrated.cooked) ? migrated.cooked : [],
      shop: migrated.shop && typeof migrated.shop === "object" ? migrated.shop : EMPTY.shop,
      swaps:
        migrated.swaps && typeof migrated.swaps === "object" && !Array.isArray(migrated.swaps)
          ? migrated.swaps
          : {},
      notes:
        migrated.notes && typeof migrated.notes === "object" && !Array.isArray(migrated.notes)
          ? migrated.notes
          : {},
    };
  } catch {
    return EMPTY;
  }
}

export function save(patch: Partial<Stored>): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...load(), ...patch, version: SCHEMA_VERSION };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable or full. The app keeps working from memory.
  }
}

/**
 * Clears the plan and everything tied to it, but NOT the saved recipes or the
 * notes written against them. Those are the accumulated knowledge of what the
 * twins will actually eat, they took weeks to build, and a button labelled
 * "clear the plan" has no business deleting them.
 */
export function clearPlan(): void {
  const kept = load();
  save({
    ...EMPTY,
    saved: kept.saved,
    notes: kept.notes,
    settings: kept.settings,
    allergensSeen: kept.allergensSeen,
  });
}

/** Everything, including the saved recipes and notes. */
export function clear(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export { migrate as migrateStored, SCHEMA_VERSION };
export type { Stored };
