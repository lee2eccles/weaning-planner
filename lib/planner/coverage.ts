import type { MealSlot, Plan, PlanSettings } from "@/lib/types";

/**
 * How much food a plan has to cover, counted in meals.
 *
 * A meal is one sitting for everyone eating: four lunches means four days of
 * lunch, whether one baby eats them or two. That is how the question actually
 * arrives — "I only need four lunches this week" — so it is the number the app
 * asks for and the only one it stores. Portions of food are derived from it,
 * not the other way round.
 *
 * Everything downstream still works in days; this module is the only place
 * that knows how meals become days.
 */

export const MIN_MEALS = 1;
/** Four weeks of every planned slot. Beyond that the fresh food is not fresh. */
export const MAX_DAYS = 28;

export const MIN_EATERS = 1;
export const MAX_EATERS = 8;

/**
 * The spans a parent actually asks for: a few days, a week, a fortnight, a
 * month. Presets are held as days rather than as meals so that they survive
 * breakfast being switched on — see `mealPresets`.
 */
const PRESET_DAYS = [4, 7, 14, 28];

type Sized = Pick<PlanSettings, "meals" | "slots" | "eaters">;

/** Meals eaten per day — one per planned slot. */
export function slotsPerDay(settings: Pick<PlanSettings, "slots">): number {
  return Math.max(1, settings.slots.length);
}

export function maxMeals(settings: Pick<PlanSettings, "slots">): number {
  return MAX_DAYS * slotsPerDay(settings);
}

export function clampMeals(value: number, settings: Pick<PlanSettings, "slots">): number {
  if (!Number.isFinite(value)) return MIN_MEALS;
  return Math.min(maxMeals(settings), Math.max(MIN_MEALS, Math.round(value)));
}

/** Days the plan runs for. Two slots a day means four meals is two days. */
export function planDays(settings: Sized): number {
  return Math.max(1, Math.ceil(clampMeals(settings.meals, settings) / slotsPerDay(settings)));
}

/** Meals actually planned. Rounds up to a whole day when slots do not divide. */
export function mealsPlanned(settings: Sized): number {
  return planDays(settings) * slotsPerDay(settings);
}

/** Baby portions of food: every meal feeds everyone eating. */
export function portionsPlanned(settings: Sized): number {
  return mealsPlanned(settings) * Math.max(MIN_EATERS, settings.eaters);
}

/**
 * Asking for three meals across two slots a day gets you four, because half a
 * day is not a thing the planner can cook. This is the surplus, so the UI can
 * own up to it rather than quietly changing the number.
 */
export function mealsOvershoot(settings: Sized): number {
  return Math.max(0, mealsPlanned(settings) - clampMeals(settings.meals, settings));
}

/** "lunches" · "breakfasts" · "meals" — what the number in the box counts. */
export function mealWord(settings: Pick<PlanSettings, "slots">, count = 2): string {
  if (settings.slots.length === 1) {
    const slot: MealSlot = settings.slots[0];
    if (count === 1) return slot === "lunch" ? "lunch" : "breakfast";
    return slot === "lunch" ? "lunches" : "breakfasts";
  }
  return count === 1 ? "meal" : "meals";
}

/**
 * The shortcut sizes, in the unit the question is asked in.
 *
 * Every one is a whole number of days, because the planner cooks whole days:
 * a flat list of meal counts offered "7 meals" to someone planning breakfast
 * and lunch, highlighted it as chosen, and then planned eight — a control
 * that contradicts its own summary a line later.
 */
export function mealPresets(settings: Pick<PlanSettings, "slots">): { meals: number; days: number }[] {
  const per = slotsPerDay(settings);
  return PRESET_DAYS.filter((days) => days <= MAX_DAYS).map((days) => ({ meals: days * per, days }));
}

/**
 * How far one press of the stepper moves.
 *
 * A whole day, so the buttons can only ever land on a number the planner can
 * deliver. Typing an odd number by hand still works, and still gets the
 * rounding note — the difference is that the app no longer proposes one.
 */
export function mealStep(settings: Pick<PlanSettings, "slots">): number {
  return slotsPerDay(settings);
}

export function daysLabel(days: number): string {
  if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
  const w = Math.floor(days / 7);
  const d = days % 7;
  const weeksPart = `${w} week${w === 1 ? "" : "s"}`;
  if (d === 0) return weeksPart;
  return `${weeksPart} and ${d} day${d === 1 ? "" : "s"}`;
}

/**
 * "4 lunches · 8 baby portions" — the phrase under every heading.
 *
 * Counted from the meals the plan actually holds, not from the number that was
 * asked for. Where the planner could not fill a day — no lunch exists at 6+
 * months, say — the two diverge, and the heading on a plan of empty days used
 * to promise a fortnight of food that was never cooked.
 */
export function plannedSummary(plan: Pick<Plan, "meals" | "settings">): string {
  const meals = plan.meals.length;
  const portions = meals * Math.max(MIN_EATERS, plan.settings.eaters);
  return `${meals} ${mealWord(plan.settings, meals)} · ${portions} baby portion${
    portions === 1 ? "" : "s"
  }`;
}
