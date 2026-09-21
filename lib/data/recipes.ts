import type { MealSlot, Recipe } from "@/lib/types";
import { CORE_RECIPES } from "./recipes.core";
import { EXTRA_RECIPES } from "./recipes.app";
import { QUICK_RECIPES } from "./recipes.quick";
import { FIRST_LUNCHES } from "./recipes.first";

export const ALL_RECIPES: Recipe[] = [
  ...CORE_RECIPES, ...EXTRA_RECIPES, ...QUICK_RECIPES, ...FIRST_LUNCHES,
];

/** Fifteen minutes hands-on or less — the ones that fit between naps. */
export const QUICK_MAX_MINUTES = 15;

/**
 * The only recipes a plan may draw from. Every recipe in the library is
 * legume-free by construction, but the filter stays as a structural guarantee
 * so that adding one that is not can never reach a plan. PRD §4.1 R1.
 */
export const PLANNABLE_RECIPES: Recipe[] = ALL_RECIPES.filter((r) => r.legumeStatus !== "contains");

/** Iron matters more here than usual — see the note on Recipe.ironRich. */
export const IRON_RICH_RECIPES: Recipe[] = PLANNABLE_RECIPES.filter((r) => r.ironRich);

export const RECIPES_BY_ID: Map<string, Recipe> = new Map(ALL_RECIPES.map((r) => [r.id, r]));

export function getRecipe(id: string): Recipe {
  const r = RECIPES_BY_ID.get(id);
  if (!r) throw new Error(`Unknown recipe id: ${id}`);
  return r;
}

export function plannableFor(slot: MealSlot, ageBandMonths: number): Recipe[] {
  return PLANNABLE_RECIPES.filter((r) => r.slots.includes(slot) && r.ageBandMonths <= ageBandMonths);
}
