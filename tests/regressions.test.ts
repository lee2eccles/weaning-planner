import { describe, it, expect } from "vitest";
import { generatePlan, currentDayIndex } from "@/lib/planner/generate";
import { getRecipe } from "@/lib/data/recipes";
import { mealStateFor } from "@/lib/planner/constraints";

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

  it("holds on the last day once everything is eaten", () => {
    const plan = generatePlan({ settings: { meals: 7 }, restarts: 5, seed: 1 });
    const eaten = new Set(plan.meals.map((m) => `${m.dayIndex}:${m.slot}`));
    expect(currentDayIndex(plan, eaten)).toBe(6);
  });

  it("carries no calendar date at all", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 5, seed: 1 });
    expect(plan).not.toHaveProperty("startDate");
  });
});
