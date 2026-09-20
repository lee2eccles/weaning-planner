import { describe, it, expect } from "vitest";
import { weeks } from "@/lib/planner/coverage";
import { generatePlan, currentDayIndex, todayIso } from "@/lib/planner/generate";
import { getRecipe } from "@/lib/data/recipes";
import { mealStateFor } from "@/lib/planner/constraints";

describe("swapping a meal must not lock the whole plan", () => {
  it("preserves each meal's own lock flag when meals are kept", () => {
    // Regression: swapMeal passed every meal with locked:true, and the generator
    // forced locked:true on top, so one swap locked all 14 meals and turned
    // Regenerate into a verified no-op.
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed: 5 });
    expect(plan.meals.some((m) => m.locked)).toBe(false);

    const swapped = plan.meals.map((m, i) =>
      i === 3 ? { ...m, recipeId: plan.meals[0].recipeId } : m
    );
    const rebuilt = generatePlan({
      settings: plan.settings, locked: swapped, restarts: 1,
      planId: plan.id, startDate: plan.startDate,
    });

    expect(rebuilt.meals.filter((m) => m.locked)).toHaveLength(0);
    expect(rebuilt.id).toBe(plan.id);
  });

  it("still honours meals the user actually locked", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed: 6 });
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
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed: 7 });
    const target = plan.meals.find((m) => m.state === "defrost");
    if (!target) return;
    const noCook = getRecipe("app-avocado-cream-cheese-cucumber-toast");
    const swapped = plan.meals.map((m) =>
      m.dayIndex === target.dayIndex && m.slot === target.slot
        ? { ...m, recipeId: noCook.id }
        : m
    );
    const rebuilt = generatePlan({
      settings: plan.settings, locked: swapped, restarts: 1, startDate: plan.startDate,
    });
    const after = rebuilt.meals.find(
      (m) => m.dayIndex === target.dayIndex && m.slot === target.slot
    )!;
    expect(after.state).toBe(mealStateFor(noCook, target.dayIndex));
    expect(after.state).not.toBe("defrost");
    expect(after.cubesToDefrost).toBeUndefined();
  });
});

describe("Today means today", () => {
  it("records a start date on every plan", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 5, seed: 1 });
    expect(plan.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(plan.startDate).toBe(todayIso());
  });

  it("maps a date to the right day of the plan", () => {
    const plan = generatePlan({
      settings: { coverage: weeks(2) }, restarts: 5, seed: 1, startDate: "2026-09-21",
    });
    expect(currentDayIndex(plan, new Date(2026, 8, 21))).toBe(0);
    expect(currentDayIndex(plan, new Date(2026, 8, 25))).toBe(4);
    expect(currentDayIndex(plan, new Date(2026, 9, 4))).toBe(13);
  });

  it("returns null when today falls outside the plan", () => {
    const plan = generatePlan({
      settings: { coverage: weeks(2) }, restarts: 5, seed: 1, startDate: "2026-09-21",
    });
    expect(currentDayIndex(plan, new Date(2026, 8, 20))).toBeNull();
    expect(currentDayIndex(plan, new Date(2026, 9, 5))).toBeNull();
  });

  it("uses local dates, so the day does not shift across midnight UTC", () => {
    const plan = generatePlan({
      settings: { coverage: weeks(1) }, restarts: 5, seed: 1, startDate: "2026-09-21",
    });
    expect(currentDayIndex(plan, new Date(2026, 8, 21, 23, 30))).toBe(0);
    expect(currentDayIndex(plan, new Date(2026, 8, 22, 0, 30))).toBe(1);
  });
});
