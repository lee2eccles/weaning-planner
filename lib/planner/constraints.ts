import type { MealSlot, PlannedMeal, Recipe, MealState, PlanSettings } from "@/lib/types";

/**
 * Hard constraints H1–H9 from PRD §6.2. Anything here is non-negotiable:
 * the planner will leave a gap before it will break one of these.
 */

export const MAX_USES_PER_WEEK = 2;
export const MAX_DAYS_PER_PREP_SESSION = 14;

/** Which prep session covers a given day. H8. */
export function sessionForDay(dayIndex: number): number {
  return Math.floor(dayIndex / MAX_DAYS_PER_PREP_SESSION);
}

/** The day a prep session's cooking happens — the first day it covers. */
export function cookDayForSession(sessionIndex: number): number {
  return sessionIndex * MAX_DAYS_PER_PREP_SESSION;
}

/**
 * Quick enough to cook from scratch on the morning itself rather than
 * batch-cooking it on prep day. Scrambled egg is an eight-minute job — treating
 * it as freezer-or-nothing would waste freezer space we do not have.
 */
export const COOK_FRESH_MAX_MINUTES = 15;

export function canCookFresh(recipe: Recipe): boolean {
  return recipe.activeMinutes <= COOK_FRESH_MAX_MINUTES && !recipe.longRecipe;
}

/**
 * How a meal reaches the table. H5/H6.
 * Returns null when the recipe cannot legally be served on that day.
 */
export function mealStateFor(recipe: Recipe, dayIndex: number): MealState | null {
  const offset = dayIndex - cookDayForSession(sessionForDay(dayIndex));

  // No-cook recipes are assembled on the day and never stored.
  if (recipe.noCook) return "noCook";

  if (offset === 0) return "cookToday";

  // Within the fridge window of the cook day.
  if (offset < recipe.fridgeDays) return "fromFridge";

  // Beyond the fridge window, the freezer is the usual route.
  if (recipe.freezable !== "no") return "defrost";

  // Otherwise it is only possible if it is quick enough to make on the morning.
  if (canCookFresh(recipe)) return "cookToday";

  return null;
}

/**
 * Whether a meal's food is produced during the prep session, as opposed to
 * being made from scratch on its own morning.
 *
 * Without this, a ten-minute recipe scheduled on day 9 gets batch-cooked on day 1
 * and sits in the fridge for a week. It is the sort of bug that looks like a
 * planning quirk and is actually a food-safety one.
 */
export function isBatchCooked(recipe: Recipe, dayIndex: number): boolean {
  const state = mealStateFor(recipe, dayIndex);
  if (state === null || state === "noCook") return false;
  if (state === "cookToday") return dayIndex === cookDayForSession(sessionForDay(dayIndex));
  return true;
}

export function usesInWeek(meals: PlannedMeal[], recipeId: string, dayIndex: number, slot: MealSlot): number {
  const weekStart = Math.floor(dayIndex / 7) * 7;
  return meals.filter(
    (m) =>
      m.recipeId === recipeId &&
      m.slot === slot &&
      m.dayIndex >= weekStart &&
      m.dayIndex < weekStart + 7
  ).length;
}

export function usedOnPreviousDay(meals: PlannedMeal[], recipeId: string, dayIndex: number, slot: MealSlot): boolean {
  return meals.some((m) => m.recipeId === recipeId && m.slot === slot && m.dayIndex === dayIndex - 1);
}

export interface EligibilityContext {
  meals: PlannedMeal[];
  dayIndex: number;
  slot: MealSlot;
  settings: PlanSettings;
}

/** Every hard constraint, in one place. Returns null if eligible, else the reason. */
export function ineligibleReason(recipe: Recipe, ctx: EligibilityContext): string | null {
  // H1 — the one that matters most.
  if (recipe.legumeStatus === "contains") return "contains legumes";

  if (!recipe.slots.includes(ctx.slot)) return "wrong meal slot";

  // H2
  if (recipe.ageBandMonths > ctx.settings.ageBandMonths) return "too old for this age band";

  // H3
  if (usedOnPreviousDay(ctx.meals, recipe.id, ctx.dayIndex, ctx.slot)) return "served yesterday";

  // H4
  if (usesInWeek(ctx.meals, recipe.id, ctx.dayIndex, ctx.slot) >= MAX_USES_PER_WEEK) {
    return "already twice this week";
  }

  // H5/H6
  if (mealStateFor(recipe, ctx.dayIndex) === null) return "cannot be kept that long";

  return null;
}

export function eligibleRecipes(pool: Recipe[], ctx: EligibilityContext): Recipe[] {
  return pool.filter((r) => ineligibleReason(r, ctx) === null);
}
