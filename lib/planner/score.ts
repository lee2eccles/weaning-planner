import type { PlannedMeal, Recipe, PlanSettings } from "@/lib/types";
import { PANTRY_STAPLES } from "@/lib/data/ingredients";
import { getRecipe } from "@/lib/data/recipes";
import { mealStateFor, sessionForDay } from "./constraints";
import { planDays } from "./coverage";
import { cubesPerPortion, cubesPerWave, trayFit } from "./portions";

/**
 * Scoring weights. PRD §6.3. Tuned so that overlap and variety dominate,
 * and trayFit only ever breaks ties.
 */
export const WEIGHTS = {
  overlap: 3.0,
  pack: 1.5,
  variety: 1.2,
  leftover: 2.5,
  tray: 0.4,
  effort: 1.0,
  repeat: 4.0,
  salt: 2.0,
  freezerPressure: 4.0,
  batchPreference: 1.2,
  /**
   * Saved recipes are the ones the twins actually ate. Big enough to tilt a
   * close call, deliberately too small to override variety or overlap — a plan
   * of nothing but the same six saved meals is not what saving them meant.
   */
  saved: 1.6,
  /**
   * First foods past six months. A nudge, not a bar: they stay plannable and
   * stay in the swap picker, because a purée fork-mashed is a perfectly good
   * meal at nine months and NHS guidance sets no cut-off. It only stops eight
   * smooth recipes competing on equal terms for a one-year-old's fortnight.
   */
  firstFood: 2.0,
};

export interface ScoreContext {
  meals: PlannedMeal[];
  dayIndex: number;
  slot: PlannedMeal["slot"];
  settings: PlanSettings;
  /** Recipes already chosen within this prep session, with how many meals each covers. */
  sessionUse: Map<string, number>;
  /** Running cube demand for the current prep session. */
  sessionCubes: number;
  /** Recipe ids the parent has saved — the ones known to go down well. */
  preferred?: Set<string>;
}

function perishableWeight(item: string, perishability: number): number {
  return PANTRY_STAPLES.has(item) ? 0.05 : perishability;
}

/**
 * Shared ingredients with recipes already in this prep session, weighted by how
 * perishable they are. Sharing a bag of spinach matters; sharing olive oil doesn't.
 */
export function ingredientOverlap(recipe: Recipe, ctx: ScoreContext): number {
  if (ctx.sessionUse.size === 0) return 0;

  const alreadyUsed = new Map<string, number>();
  for (const id of ctx.sessionUse.keys()) {
    for (const i of getRecipe(id).ingredients) {
      alreadyUsed.set(i.item, Math.max(alreadyUsed.get(i.item) ?? 0, i.perishability));
    }
  }

  let score = 0;
  for (const i of recipe.ingredients) {
    if (alreadyUsed.has(i.item)) {
      score += perishableWeight(i.item, i.perishability);
    }
  }
  return score;
}

/**
 * Rewards plans that use up whole supermarket packs. If the session already needs
 * one of a two-pack of beetroot, a second beetroot recipe earns its place.
 */
export function packEfficiency(recipe: Recipe, ctx: ScoreContext): number {
  const demand = new Map<string, number>();
  for (const [id, meals] of ctx.sessionUse) {
    for (const i of getRecipe(id).ingredients) {
      if (i.quantity == null) continue;
      demand.set(i.item, (demand.get(i.item) ?? 0) + i.quantity * meals);
    }
  }

  let score = 0;
  for (const i of recipe.ingredients) {
    if (i.quantity == null || !i.packSize || PANTRY_STAPLES.has(i.item)) continue;
    const before = demand.get(i.item) ?? 0;
    if (before === 0) continue;
    const after = before + i.quantity;
    const packsBefore = Math.ceil(before / i.packSize);
    const packsAfter = Math.ceil(after / i.packSize);
    // Fitting inside a pack we're already buying is free food.
    if (packsAfter === packsBefore) score += perishableWeight(i.item, i.perishability);
  }
  return score;
}

/**
 * Days since this recipe last filled this slot. Pushes repeats apart.
 *
 * The scale is the plan, not a fixed week. Judging a four-day plan by a
 * fortnight's idea of variety made it cook three different recipes for four
 * lunches — one of them a 35-minute risotto for two portions, dragging five
 * items onto the shopping list.
 */
export function varietyScore(recipe: Recipe, ctx: ScoreContext): number {
  const previous = ctx.meals
    .filter((m) => m.recipeId === recipe.id && m.slot === ctx.slot)
    .map((m) => m.dayIndex);
  if (previous.length === 0) return 1;
  const gap = ctx.dayIndex - Math.max(...previous);
  const scale = Math.max(2, Math.min(7, planDays(ctx.settings)));
  return Math.min(gap / scale, 1);
}

/**
 * Several recipes genuinely feed each other — the Beetroot Pancakes want leftover
 * porridge, and one roasted sweet potato serves both the Frittata Squares and
 * the Sweet Potato Pancakes. Scheduling the producer before the consumer is
 * materially smarter planning.
 */
export function leftoverChainBonus(recipe: Recipe, ctx: ScoreContext): number {
  if (!recipe.usesLeftover) return 0;
  const need = recipe.usesLeftover.toLowerCase();
  for (const id of ctx.sessionUse.keys()) {
    const other = getRecipe(id);
    const haystack = `${other.title} ${other.ingredients.map((i) => i.item).join(" ")}`.toLowerCase();
    if (need.split(" ").every((w) => haystack.includes(w))) return 1;
  }
  return 0;
}

/** Light nudge toward batches that fill whole trays. Deliberately weak. */
export function trayFitScore(recipe: Recipe, ctx: ScoreContext): number {
  if (recipe.freezeFormat !== "cube" || !recipe.cubesYielded) return 0;
  const mealsSoFar = ctx.sessionUse.get(recipe.id) ?? 0;
  const portions = (mealsSoFar + 1) * ctx.settings.eaters;
  const batches = Math.ceil(portions / recipe.babyPortions);
  return trayFit(batches * recipe.cubesYielded, ctx.settings.freezer);
}

/**
 * This is a batch-prep app. No-cook assembly meals exist to relieve freezer
 * pressure, not to become the default — without this they win on every other
 * term at once (no freezer space, no effort) and crowd out the cooking.
 */
export function batchPreferencePenalty(recipe: Recipe, ctx: ScoreContext): number {
  const state = mealStateFor(recipe, ctx.dayIndex);
  if (state !== "noCook") return 0;

  const noCookSoFar = ctx.meals.filter(
    (m) => getRecipe(m.recipeId).noCook && m.slot === ctx.slot
  ).length;
  const slotsSoFar = Math.max(ctx.meals.filter((m) => m.slot === ctx.slot).length, 1);
  const share = noCookSoFar / slotsSoFar;

  // Free up to about a fifth of meals, then increasingly costly.
  return share <= 0.2 ? 0.3 : 1 + (share - 0.2) * 6;
}

/** Discourages stacking long recipes, and cooking from scratch on a weekday. */
export function effortPenalty(recipe: Recipe, ctx: ScoreContext): number {
  let penalty = 0;

  if (recipe.longRecipe) {
    const longInSession = [...ctx.sessionUse.keys()].filter((id) => getRecipe(id).longRecipe).length;
    penalty += longInSession * 0.4;
  }

  const state = mealStateFor(recipe, ctx.dayIndex);
  if (state === "cookToday" && ctx.dayIndex % 7 < 5) penalty += 0.3;
  penalty += recipe.activeMinutes / 120;

  return penalty;
}

/** Two salty recipes on one day is more salt than a 7-month-old should have. */
export function saltPenalty(recipe: Recipe, ctx: ScoreContext): number {
  if (!recipe.saltAware) return 0;
  const sameDay = ctx.meals.filter((m) => m.dayIndex === ctx.dayIndex);
  return sameDay.some((m) => getRecipe(m.recipeId).saltAware) ? 1 : 0;
}

/**
 * As the freezer fills, push toward meals that need no freezer space at all.
 * The no-cook recipes are load-bearing under this constraint, not filler. PRD §6.5.3.
 */
export function freezerPressure(recipe: Recipe, ctx: ScoreContext): number {
  const capacity = cubesPerWave(ctx.settings.freezer) * 2; // two comfortable waves
  const pressure = Math.min(ctx.sessionCubes / capacity, 2);
  if (pressure < 0.55) return 0;

  const state = mealStateFor(recipe, ctx.dayIndex);
  if (state === "noCook" || state === "cookToday" || state === "fromFridge") return 0;

  const cubes = recipe.freezeFormat === "cube" ? cubesPerPortion(ctx.settings.freezer) * ctx.settings.eaters : 2;
  return pressure * (cubes / 4);
}

/**
 * How much a repeat costs. On a short plan repeating a recipe is the point —
 * cooking one batch twice is why you batch cook — so the flat penalty that
 * suits a fortnight is relaxed as the plan gets shorter.
 */
function repeatCost(ctx: ScoreContext): number {
  return planDays(ctx.settings) <= 7 ? 0.1 : 0.25;
}

export function scoreRecipe(recipe: Recipe, ctx: ScoreContext): number {
  return (
    WEIGHTS.saved * (ctx.preferred?.has(recipe.id) ? 1 : 0) -
    WEIGHTS.firstFood * (recipe.firstFood && ctx.settings.ageBandMonths > 6 ? 1 : 0) +
    WEIGHTS.overlap * ingredientOverlap(recipe, ctx) +
    WEIGHTS.pack * packEfficiency(recipe, ctx) +
    WEIGHTS.variety * varietyScore(recipe, ctx) +
    WEIGHTS.leftover * leftoverChainBonus(recipe, ctx) +
    WEIGHTS.tray * trayFitScore(recipe, ctx) -
    WEIGHTS.batchPreference * batchPreferencePenalty(recipe, ctx) -
    WEIGHTS.effort * effortPenalty(recipe, ctx) -
    WEIGHTS.repeat * (ctx.sessionUse.get(recipe.id) ?? 0) * repeatCost(ctx) -
    WEIGHTS.salt * saltPenalty(recipe, ctx) -
    WEIGHTS.freezerPressure * freezerPressure(recipe, ctx)
  );
}

export { sessionForDay };
