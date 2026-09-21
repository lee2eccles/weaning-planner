import { describe, it, expect } from "vitest";
import { generatePlan, currentDayIndex, DEFAULT_SETTINGS } from "@/lib/planner/generate";
import { getRecipe, PLANNABLE_RECIPES } from "@/lib/data/recipes";
import { mealStateFor } from "@/lib/planner/constraints";
import { plannedSummary } from "@/lib/planner/coverage";
import { buildShoppingLists, planToText } from "@/lib/shopping/merge";
import type { MealSlot } from "@/lib/types";

describe("swapping a meal must not lock the whole plan", () => {
  it("preserves each meal's own lock flag when meals are kept", () => {
    // Regression: swapMeal passed every meal with locked:true, and the generator
    // forced locked:true on top, so one swap locked all 14 meals and turned
    // Regenerate into a verified no-op.
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 5 });
    expect(plan.meals.some((m) => m.locked)).toBe(false);

    const swapped = plan.meals.map((m, i) =>
      i === 3 ? { ...m, recipeId: plan.meals[0].recipeId } : m
    );
    const rebuilt = generatePlan({
      settings: plan.settings, locked: swapped, restarts: 1,
      planId: plan.id,
    });

    expect(rebuilt.meals.filter((m) => m.locked)).toHaveLength(0);
    expect(rebuilt.id).toBe(plan.id);
  });

  it("still honours meals the user actually locked", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 6 });
    const locked = [{ ...plan.meals[2], locked: true }];
    const rebuilt = generatePlan({ settings: plan.settings, locked, restarts: 10, seed: 99 });
    const kept = rebuilt.meals.find(
      (m) => m.dayIndex === locked[0].dayIndex && m.slot === locked[0].slot
    );
    expect(kept?.recipeId).toBe(locked[0].recipeId);
    expect(kept?.locked).toBe(true);
    expect(rebuilt.meals.filter((m) => m.locked)).toHaveLength(1);
  });

  it("recomputes how a swapped-in meal reaches the table", () => {
    // Swapping a frozen meal for a no-cook one must not leave it saying "defrost".
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 7 });
    const target = plan.meals.find((m) => m.state === "defrost");
    if (!target) return;
    const noCook = getRecipe("app-avocado-cream-cheese-cucumber-toast");
    const swapped = plan.meals.map((m) =>
      m.dayIndex === target.dayIndex && m.slot === target.slot
        ? { ...m, recipeId: noCook.id }
        : m
    );
    const rebuilt = generatePlan({
      settings: plan.settings, locked: swapped, restarts: 1,
    });
    const after = rebuilt.meals.find(
      (m) => m.dayIndex === target.dayIndex && m.slot === target.slot
    )!;
    expect(after.state).toBe(mealStateFor(noCook, target.dayIndex));
    expect(after.state).not.toBe("defrost");
    expect(after.cubesToDefrost).toBeUndefined();
  });
});

describe("where you are in the plan", () => {
  it("starts on day one when nothing has been eaten", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 5, seed: 1 });
    expect(currentDayIndex(plan, new Set())).toBe(0);
  });

  it("advances as meals are ticked off, not as the calendar moves", () => {
    // Regression in intent: the plan used to be anchored to the date it was
    // made, so a plan built on Thursday and started on Sunday showed the wrong
    // day — and a four-lunch plan claimed to be "the next four days".
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 5, seed: 1 });
    const eaten = new Set<string>();
    for (const m of plan.meals.filter((x) => x.dayIndex < 3)) {
      eaten.add(`${m.dayIndex}:${m.slot}`);
    }
    expect(currentDayIndex(plan, eaten)).toBe(3);
  });

  it("reports a finished plan rather than pointing at the last day", () => {
    const plan = generatePlan({ settings: { meals: 7 }, restarts: 5, seed: 1 });
    const eaten = new Set(plan.meals.map((m) => `${m.dayIndex}:${m.slot}`));
    expect(currentDayIndex(plan, eaten)).toBeNull();
  });

  it("moves past a meal that never happened", () => {
    // Skipping used to pin "up next" on the skipped day forever, so the only
    // way onward was to tick "eaten" on food nobody ate — which also filed a
    // false first allergen exposure.
    const plan = generatePlan({ settings: { meals: 7 }, restarts: 5, seed: 1 });
    const done = new Set<string>();
    for (const m of plan.meals.filter((x) => x.dayIndex === 0)) done.add(`0:${m.slot}`);
    for (const m of plan.meals.filter((x) => x.dayIndex === 1)) done.add(`1:${m.slot}`);
    expect(currentDayIndex(plan, done)).toBe(2);
  });

  it("carries no calendar date at all", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 5, seed: 1 });
    expect(plan).not.toHaveProperty("startDate");
  });
});

describe("a plan the library cannot fill", () => {
  /**
   * At 6+ months every recipe in the library is a breakfast, so a lunch plan
   * at that band comes out empty. It used to do so silently: the heading
   * counted the meals asked for, the finished banner claimed every one was
   * ticked off, and the shopping tab crashed on the list that was never built.
   */
  const at6 = { ...DEFAULT_SETTINGS, ageBandMonths: 6, meals: 14, slots: ["lunch"] as MealSlot[] };

  it("says how many meals it could not fill, and why", () => {
    const plan = generatePlan({ settings: at6, restarts: 4, seed: 1 });
    expect(plan.meals).toHaveLength(0);
    expect(plan.warnings.join(" ")).toMatch(/14 lunches could not be filled/);
    expect(plan.warnings.join(" ")).toMatch(/6\+ months/);
  });

  it("names the ruled-out list when that is what emptied the pool", () => {
    const blocked = PLANNABLE_RECIPES.filter((r) => r.slots.includes("lunch")).map((r) => r.id);
    const plan = generatePlan({ settings: DEFAULT_SETTINGS, blocked, restarts: 4, seed: 2 });
    expect(plan.warnings.join(" ")).toMatch(/"not again" list/);
  });

  it("counts the meals it holds, not the meals it was asked for", () => {
    const plan = generatePlan({ settings: at6, restarts: 4, seed: 3 });
    expect(plannedSummary(plan)).toBe("0 lunches · 0 baby portions");
    expect(planToText(plan)).toContain("0 lunches");
  });

  it("builds no shopping list to crash on", () => {
    const plan = generatePlan({ settings: at6, restarts: 4, seed: 4 });
    expect(buildShoppingLists(plan)).toHaveLength(0);
  });

  it("is not a finished plan — there was never a meal in it", () => {
    const plan = generatePlan({ settings: at6, restarts: 4, seed: 5 });
    // currentDayIndex has no day left to serve, which the UI must not read as
    // "every meal is ticked off".
    expect(currentDayIndex(plan, new Set())).toBeNull();
    expect(plan.meals.length > 0 && currentDayIndex(plan, new Set()) === null).toBe(false);
  });

  it("still warns when only some days go unfilled", () => {
    // Four breakfasts exist at 6+ months, and each may be served twice a week —
    // enough for a full week. Rule two of them out and the week no longer fills.
    const settings = { ...DEFAULT_SETTINGS, ageBandMonths: 6, meals: 7, slots: ["breakfast"] as MealSlot[] };
    const suitable = PLANNABLE_RECIPES.filter(
      (r) => r.ageBandMonths <= 6 && r.slots.includes("breakfast")
    );
    const blocked = suitable.slice(0, 2).map((r) => r.id);
    const plan = generatePlan({ settings, blocked, restarts: 4, seed: 6 });
    expect(plan.meals.length).toBeGreaterThan(0);
    expect(plan.meals.length).toBeLessThan(7);
    const warning = plan.warnings.join(" ");
    expect(warning).toMatch(/breakfasts could not be filled/);
    // The third branch: recipes exist and are allowed, but the no-repeat rules
    // run out before the days do.
    expect(warning).toMatch(/two days running/);
  });
});
