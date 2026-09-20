import type {
  CookFreshItem, CookItem, FreezeWave, MealSlot, Plan, PlanSettings, PlannedMeal,
  PrepSession, Recipe, TrayAssignment,
} from "@/lib/types";
import { PLANNABLE_RECIPES, getRecipe } from "@/lib/data/recipes";
import { cookDayForSession, eligibleRecipes, isBatchCooked, mealStateFor, sessionForDay, MAX_DAYS_PER_PREP_SESSION } from "./constraints";
import { scoreRecipe, type ScoreContext } from "./score";
import { chooseBatchMultiplier, cubesFor, cubesPerPortion, cubesPerWave, DEFAULT_FREEZER } from "./portions";
import { planDays } from "./coverage";

export const DEFAULT_SETTINGS: PlanSettings = {
  meals: 14,
  slots: ["lunch"],
  prepDayIndex: 6,
  ageBandMonths: 9,
  eaters: 2,
  freezer: DEFAULT_FREEZER,
};

/** Deterministic PRNG so a seed always reproduces the same plan. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Attempt {
  meals: PlannedMeal[];
  score: number;
  gaps: number;
}

function buildAttempt(
  settings: PlanSettings,
  pool: Recipe[],
  rand: () => number,
  preferred?: Set<string>
): Attempt {
  const totalDays = planDays(settings);
  const meals: PlannedMeal[] = [];
  const sessionUse = new Map<number, Map<string, number>>();
  const sessionCubes = new Map<number, number>();
  let totalScore = 0;
  let gaps = 0;

  for (let day = 0; day < totalDays; day++) {
    const session = sessionForDay(day);
    if (!sessionUse.has(session)) sessionUse.set(session, new Map());
    if (!sessionCubes.has(session)) sessionCubes.set(session, 0);

    for (const slot of settings.slots) {
      const use = sessionUse.get(session)!;
      const ctx: ScoreContext = {
        meals, dayIndex: day, slot, settings,
        sessionUse: use,
        sessionCubes: sessionCubes.get(session)!,
        preferred,
      };

      const candidates = eligibleRecipes(pool, { meals, dayIndex: day, slot, settings });
      if (candidates.length === 0) { gaps++; continue; }

      const scored = candidates
        .map((r) => ({ r, s: scoreRecipe(r, ctx) }))
        .sort((a, b) => b.s - a.s);

      // Sample from the top few so restarts explore genuinely different plans.
      const window = Math.min(3, scored.length);
      const pick = scored[Math.floor(rand() * window)];

      const state = mealStateFor(pick.r, day)!;
      const cubes = state === "defrost" && pick.r.freezeFormat === "cube"
        ? cubesPerPortion(settings.freezer) * settings.eaters
        : 0;

      meals.push({
        dayIndex: day, slot, recipeId: pick.r.id, state,
        cubesToDefrost: cubes || undefined,
        portionsToDefrost:
          state === "defrost" && pick.r.freezeFormat !== "cube" ? settings.eaters : undefined,
        locked: false, prepSessionIndex: session,
      });

      use.set(pick.r.id, (use.get(pick.r.id) ?? 0) + 1);
      sessionCubes.set(session, sessionCubes.get(session)! + cubes);
      totalScore += pick.s;
    }
  }

  return { meals, score: totalScore - gaps * 1000, gaps };
}

/** Distinct ingredients used, versus the naive sum. The anti-waste measure. */
export function ingredientEfficiency(meals: PlannedMeal[]): { distinct: number; naive: number; saved: number } {
  const distinct = new Set<string>();
  let naive = 0;
  const counted = new Set<string>();
  for (const m of meals) {
    const r = getRecipe(m.recipeId);
    if (!counted.has(r.id)) {
      counted.add(r.id);
      naive += r.ingredients.length;
    }
    for (const i of r.ingredients) distinct.add(i.item);
  }
  return {
    distinct: distinct.size,
    naive,
    saved: naive === 0 ? 0 : 1 - distinct.size / naive,
  };
}

function buildPrepSessions(meals: PlannedMeal[], settings: PlanSettings): PrepSession[] {
  const sessions: PrepSession[] = [];
  const totalDays = planDays(settings);
  const sessionCount = Math.ceil(totalDays / MAX_DAYS_PER_PREP_SESSION);
  const perPortion = cubesPerPortion(settings.freezer);

  for (let s = 0; s < sessionCount; s++) {
    const cookDay = cookDayForSession(s);
    const days = meals.filter((m) => m.prepSessionIndex === s);
    const coversDayIndices = [...new Set(days.map((m) => m.dayIndex))].sort((a, b) => a - b);

    // Split the session's meals into what gets batch-cooked on prep day and
    // what is made from scratch on its own morning.
    const need = new Map<string, { meals: number; frozenMeals: number }>();
    const fresh = new Map<string, number[]>();

    for (const m of days) {
      const r = getRecipe(m.recipeId);
      if (!isBatchCooked(r, m.dayIndex)) {
        const list = fresh.get(m.recipeId) ?? [];
        list.push(m.dayIndex);
        fresh.set(m.recipeId, list);
        continue;
      }
      const entry = need.get(m.recipeId) ?? { meals: 0, frozenMeals: 0 };
      entry.meals++;
      if (m.state === "defrost") entry.frozenMeals++;
      need.set(m.recipeId, entry);
    }

    const cookFresh: CookFreshItem[] = [...fresh.entries()]
      .map(([recipeId, dayIndices]) => ({ recipeId, dayIndices: dayIndices.sort((a, b) => a - b) }))
      .sort((a, b) => a.dayIndices[0] - b.dayIndices[0]);

    const cook: CookItem[] = [];
    for (const [recipeId, { meals: mealCount, frozenMeals }] of need) {
      const r = getRecipe(recipeId);

      const portionsNeeded = mealCount * settings.eaters;
      const batchMultiplier = chooseBatchMultiplier(r, portionsNeeded, settings.freezer);
      const portionsProduced = batchMultiplier * r.babyPortions;
      const cubesProduced = cubesFor(r, batchMultiplier);
      const frozenPortions = frozenMeals * settings.eaters;
      const toFridgePortions = (mealCount - frozenMeals) * settings.eaters;

      // Only cube-format food occupies ice cube trays. Pancakes and frittata
      // squares are frozen flat and counted as what they are.
      const inCubes = r.freezeFormat === "cube";
      const toFreezerCubes = inCubes
        ? Math.min(frozenPortions * perPortion, cubesProduced || frozenPortions * perPortion)
        : 0;

      cook.push({
        recipeId, batchMultiplier,
        portionsProduced: Math.round(portionsProduced * 10) / 10,
        cubesProduced,
        toFridgePortions,
        toFreezerCubes,
        toFreezerPortions: inCubes ? 0 : frozenPortions,
      });
    }

    sessions.push({
      index: s,
      dayIndex: cookDay,
      coversDayIndices,
      cook,
      cookFresh,
      waves: packWaves(cook, settings),
      warnings: [],
    });
  }

  return sessions;
}

/**
 * Packs the session's freezing into waves. One recipe per tray wherever possible —
 * with 7-cube trays that is the natural outcome, and it keeps each bag a single
 * recipe, which is what makes the labels trustworthy. PRD §6.5.1a.
 */
function packWaves(cook: CookItem[], settings: PlanSettings): FreezeWave[] {
  const { trayCount, cubesPerTray } = settings.freezer;

  const trays: TrayAssignment[] = [];
  const openFreeze: string[] = [];

  for (const item of cook) {
    const r = getRecipe(item.recipeId);
    if (r.freezeFormat === "openFreeze") {
      openFreeze.push(item.recipeId);
      continue;
    }
    let remaining = item.toFreezerCubes;
    while (remaining > 0) {
      const cubes = Math.min(remaining, cubesPerTray);
      trays.push({ trayNumber: 0, recipeId: item.recipeId, cubes });
      remaining -= cubes;
    }
  }

  const waves: FreezeWave[] = [];
  // Open-freeze items occupy a slot in the wave too — same shelf, same 6 hours.
  const slotsPerWave = trayCount;
  let trayIdx = 0;
  let openIdx = 0;

  while (trayIdx < trays.length || openIdx < openFreeze.length) {
    const waveTrays: TrayAssignment[] = [];
    const waveOpen: string[] = [];
    let slots = 0;

    while (slots < slotsPerWave && trayIdx < trays.length) {
      waveTrays.push({ ...trays[trayIdx++], trayNumber: slots + 1 });
      slots++;
    }
    while (slots < slotsPerWave && openIdx < openFreeze.length) {
      waveOpen.push(openFreeze[openIdx++]);
      slots++;
    }

    waves.push({ waveNumber: waves.length + 1, trays: waveTrays, openFreezeRecipeIds: waveOpen });
    if (slots === 0) break;
  }

  return waves;
}

function collectWarnings(plan: Plan): string[] {
  const warnings: string[] = [];
  const { freezer } = plan.settings;

  for (const session of plan.prepSessions) {
    const label = plan.prepSessions.length > 1 ? `Prep session ${session.index + 1}: ` : "";

    if (session.waves.length > 3) {
      warnings.push(
        `${label}needs ${session.waves.length} freezing waves of ${freezer.trayCount} trays. ` +
          `Even spread across the day and overnight that is a lot — consider a mid-fortnight ` +
          `top-up cook, planning one week at a time, or another tray or two.`
      );
    }

    const totalCubes = session.cook.reduce((n, c) => n + c.toFreezerCubes, 0);
    if (totalCubes > freezer.freezerCapacityCubes) {
      warnings.push(
        `${label}needs ${totalCubes} cubes of freezer space, over the ${freezer.freezerCapacityCubes} configured.`
      );
    }

    const flatPortions = session.cook.reduce((n, c) => n + c.toFreezerPortions, 0);
    if (flatPortions > 0 && session.waves.some((w) => w.openFreezeRecipeIds.length > 1)) {
      warnings.push(
        `${label}${flatPortions} portions are frozen flat on baking trays rather than in cubes, ` +
          `and more than one shares a wave. You need the tray space and the shelf space at the same time.`
      );
    }

    const longOnes = session.cook.filter((c) => getRecipe(c.recipeId).longRecipe).length;
    if (longOnes > 3) {
      warnings.push(`${label}${longOnes} longer recipes in one session. Consider spreading them out.`);
    }
  }

  return warnings;
}

export interface GenerateOptions {
  settings?: Partial<PlanSettings>;
  /**
   * Meals to keep exactly as they are, each retaining its own `locked` flag.
   * Used both for user-locked meals on a regenerate and for preserving the
   * whole plan around a single swap.
   */
  locked?: PlannedMeal[];
  restarts?: number;
  seed?: number;
  /** Keep a plan's identity across a swap, so shopping ticks are not lost. */
  planId?: string;
  /** Recipe ids to lean towards — the parent's saved list. */
  preferred?: string[];
}

/**
 * Which day of the plan you are on.
 *
 * Deliberately not a calendar lookup. A plan is a sequence of meals, not a
 * diary: it might be started on the Thursday it was made or the Sunday after,
 * and a four-lunch plan is not "the next four days". So the current day is the
 * first one with a meal still to eat, and it advances as meals are ticked off.
 */
export function currentDayIndex(plan: Plan, eaten: Set<string> = new Set()): number {
  const total = planDays(plan.settings);
  for (let day = 0; day < total; day++) {
    const meals = plan.meals.filter((m) => m.dayIndex === day);
    if (meals.some((m) => !eaten.has(`${m.dayIndex}:${m.slot}`))) return day;
  }
  return Math.max(0, total - 1);
}

export function generatePlan(options: GenerateOptions = {}): Plan {
  const settings: PlanSettings = { ...DEFAULT_SETTINGS, ...options.settings };
  const pool = PLANNABLE_RECIPES;
  const restarts = options.restarts ?? 200;
  const baseSeed = options.seed ?? Math.floor(Math.random() * 1e9);

  const preferred = options.preferred?.length ? new Set(options.preferred) : undefined;

  let best: Attempt | null = null;
  for (let i = 0; i < restarts; i++) {
    const attempt = buildAttempt(settings, pool, mulberry32(baseSeed + i * 7919), preferred);
    if (!best || attempt.score > best.score) best = attempt;
  }

  let meals = best!.meals;

  // Re-apply any meals the caller wants kept, preserving each meal's OWN lock
  // flag. Forcing locked:true here meant a single swap silently locked the whole
  // plan and turned Regenerate into a no-op.
  if (options.locked?.length) {
    const keptKeys = new Set(options.locked.map((m) => `${m.dayIndex}:${m.slot}`));
    meals = meals.filter((m) => !keptKeys.has(`${m.dayIndex}:${m.slot}`));
    for (const kept of options.locked) {
      const r = getRecipe(kept.recipeId);
      // A swapped-in recipe keeps differently, so its state must be recomputed.
      const state = mealStateFor(r, kept.dayIndex) ?? "cookToday";
      const cubes =
        state === "defrost" && r.freezeFormat === "cube"
          ? cubesPerPortion(settings.freezer) * settings.eaters
          : undefined;
      meals.push({
        ...kept,
        state,
        cubesToDefrost: cubes,
        portionsToDefrost:
          state === "defrost" && r.freezeFormat !== "cube" ? settings.eaters : undefined,
        prepSessionIndex: sessionForDay(kept.dayIndex),
      });
    }
    meals.sort((a, b) => a.dayIndex - b.dayIndex || a.slot.localeCompare(b.slot));
  }

  const plan: Plan = {
    id: options.planId ?? `plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    settings,
    meals,
    prepSessions: buildPrepSessions(meals, settings),
    warnings: [],
  };

  plan.warnings = collectWarnings(plan);
  return plan;
}

/**
 * Recipes that could legally replace a given meal — for the manual swap picker.
 * Saved recipes come first: after a few weeks the saved list is the answer to
 * "what do I put here instead", and making it the top of the list is the point
 * of having saved them.
 */
export function swapOptions(
  plan: Plan,
  dayIndex: number,
  slot: MealSlot,
  saved?: Set<string>
): Recipe[] {
  const others = plan.meals.filter((m) => !(m.dayIndex === dayIndex && m.slot === slot));
  const options = eligibleRecipes(PLANNABLE_RECIPES, {
    meals: others, dayIndex, slot, settings: plan.settings,
  });
  if (!saved?.size) return options;
  return [...options].sort(
    (a, b) => Number(saved.has(b.id)) - Number(saved.has(a.id))
  );
}

export { cubesPerWave, planDays };
