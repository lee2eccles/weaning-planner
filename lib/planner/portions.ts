import type { FreezerSettings, Ingredient, Recipe, Unit } from "@/lib/types";

/** One baby portion at 7–9 months, in millilitres. PRD §5.6. */
export const BABY_PORTION_ML = 60;

export const DEFAULT_FREEZER: FreezerSettings = {
  cubeVolumeMl: 30,
  cubesPerTray: 7,
  trayCount: 6,
  freezeHours: 6,
  freezerCapacityCubes: 200,
};

/** Cubes needed to make up one baby portion. 2 at the default 30ml. */
export function cubesPerPortion(f: FreezerSettings): number {
  return Math.ceil(BABY_PORTION_ML / f.cubeVolumeMl);
}

/** Cubes frozen per freezing wave. 42 with 6 trays of 7. */
export function cubesPerWave(f: FreezerSettings): number {
  return f.trayCount * f.cubesPerTray;
}

/**
 * How well a batch fills whole trays: 1.0 when trays come out exactly full,
 * falling away as the last tray is left emptier. PRD §6.5.1a.
 */
export function trayFit(cubes: number, f: FreezerSettings): number {
  if (cubes <= 0) return 1;
  const remainder = cubes % f.cubesPerTray;
  if (remainder === 0) return 1;
  return remainder / f.cubesPerTray;
}

/**
 * Chooses a batch multiplier that covers the portions needed, preferring one
 * that leaves trays full. Steps in halves — "cook one and a half times the
 * recipe" is a real instruction; "cook 1.37 times" is not.
 */
export function chooseBatchMultiplier(
  recipe: Recipe,
  portionsNeeded: number,
  f: FreezerSettings
): number {
  const minimum = portionsNeeded / recipe.babyPortions;
  const base = Math.ceil(minimum * 2) / 2; // round up to nearest half

  if (recipe.freezeFormat !== "cube" || !recipe.cubesYielded) {
    return Math.max(base, 0.5);
  }

  // Consider the base and one half-step up, and prefer the better tray fit —
  // but only when the extra food is a genuinely small amount.
  const candidates = [base, base + 0.5];
  let best = base;
  let bestScore = -Infinity;

  for (const m of candidates) {
    const cubes = Math.round(m * recipe.cubesYielded);
    const wastePortions = m * recipe.babyPortions - portionsNeeded;
    // A half-step up is only worth it if it wastes less than a portion.
    if (m > base && wastePortions > 1) continue;
    const score = trayFit(cubes, f) - wastePortions * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return Math.max(best, 0.5);
}

export function cubesFor(recipe: Recipe, batchMultiplier: number): number {
  if (recipe.freezeFormat !== "cube" || !recipe.cubesYielded) return 0;
  return Math.round(recipe.cubesYielded * batchMultiplier);
}

/**
 * Quantities at a batch multiplier.
 *
 * The prep sheet used to say "3× batch" and leave the cook to multiply nine
 * ingredients in their head, at the hob, from a recipe written for one batch.
 * That is where a ruined pan comes from, and a ruined 3× pan is a third of the
 * fortnight.
 *
 * Grams and millilitres round to the nearest 5 once they are big enough for
 * that to be the honest precision — "283g potato" is false accuracy.
 */
export function scaleQuantity(
  quantity: number | null,
  unit: Unit,
  multiplier: number
): number | null {
  if (quantity == null) return null;
  const scaled = quantity * multiplier;
  if (unit === "g" || unit === "ml") {
    return scaled >= 20 ? Math.round(scaled / 5) * 5 : Math.round(scaled);
  }
  return Math.round(scaled * 100) / 100;
}

export function scaleIngredients(recipe: Recipe, multiplier: number): Ingredient[] {
  if (multiplier === 1) return recipe.ingredients;
  return recipe.ingredients.map((i) => ({
    ...i,
    quantity: scaleQuantity(i.quantity, i.unit, multiplier),
  }));
}

/** "3× batch" / "half batch" — how a person would say it out loud. */
export function batchLabel(multiplier: number): string {
  if (multiplier === 1) return "Single batch";
  if (multiplier === 0.5) return "Half batch";
  return `${multiplier}× batch`;
}
