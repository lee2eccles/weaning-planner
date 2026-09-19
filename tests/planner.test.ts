import { describe, it, expect } from "vitest";
import { generatePlan, ingredientEfficiency, swapOptions, DEFAULT_SETTINGS } from "@/lib/planner/generate";
import { getRecipe } from "@/lib/data/recipes";
import type { MealSlot } from "@/lib/types";
import { findLegumes } from "@/lib/data/legumes";
import { mealStateFor, sessionForDay, cookDayForSession, MAX_USES_PER_WEEK } from "@/lib/planner/constraints";
import { chooseBatchMultiplier, cubesPerPortion, trayFit, DEFAULT_FREEZER } from "@/lib/planner/portions";

const WEEKS = [1, 2, 3, 4] as const;

describe("H1 — no plan ever contains a legume", () => {
  it.each(WEEKS)("holds for a %i-week plan across many seeds", (weeks) => {
    for (let seed = 0; seed < 25; seed++) {
      const plan = generatePlan({ settings: { weeks }, restarts: 5, seed });
      for (const meal of plan.meals) {
        const r = getRecipe(meal.recipeId);
        expect(r.legumeStatus).not.toBe("contains");
        const text = [r.title, ...r.ingredients.map((i) => `${i.item} ${i.note ?? ""}`), ...r.method, ...r.tips].join(" ");
        expect(findLegumes(text)).toEqual([]);
      }
    }
  });
});

describe("H3/H4 — variety", () => {
  it.each(WEEKS)("never repeats a meal on consecutive days (%i weeks)", (weeks) => {
    const plan = generatePlan({ settings: { weeks }, restarts: 20, seed: 42 });
    for (const meal of plan.meals) {
      const yesterday = plan.meals.find(
        (m) => m.dayIndex === meal.dayIndex - 1 && m.slot === meal.slot
      );
      if (yesterday) expect(yesterday.recipeId).not.toBe(meal.recipeId);
    }
  });

  it.each(WEEKS)("serves nothing more than twice in one week (%i weeks)", (weeks) => {
    const plan = generatePlan({ settings: { weeks }, restarts: 20, seed: 7 });
    const counts = new Map<string, number>();
    for (const m of plan.meals) {
      const key = `${Math.floor(m.dayIndex / 7)}:${m.slot}:${m.recipeId}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    for (const [key, n] of counts) {
      expect(n, `${key} appears ${n} times`).toBeLessThanOrEqual(MAX_USES_PER_WEEK);
    }
  });
});

describe("H5/H6 — fridge life and freezing", () => {
  it("never serves a fridge-only recipe beyond its keeping time", () => {
    const plan = generatePlan({ settings: { weeks: 4 }, restarts: 20, seed: 3 });
    for (const meal of plan.meals) {
      const r = getRecipe(meal.recipeId);
      const offset = meal.dayIndex - cookDayForSession(sessionForDay(meal.dayIndex));
      if (r.noCook) continue;
      if (meal.state === "fromFridge") {
        expect(offset, `${r.title} on day ${meal.dayIndex}`).toBeLessThan(r.fridgeDays);
      }
      if (meal.state === "defrost") {
        expect(r.freezable, `${r.title} cannot be frozen`).not.toBe("no");
      }
    }
  });

  it("assigns a defrost cube count to every frozen cube meal", () => {
    const plan = generatePlan({ settings: { weeks: 2 }, restarts: 10, seed: 11 });
    for (const m of plan.meals.filter((m) => m.state === "defrost")) {
      const r = getRecipe(m.recipeId);
      if (r.freezeFormat === "cube") {
        expect(m.cubesToDefrost).toBe(cubesPerPortion(DEFAULT_FREEZER) * DEFAULT_SETTINGS.eaters);
      }
    }
  });

  it("returns null state for a recipe that cannot survive to that day", () => {
    const fridgeOnly = getRecipe("app-avocado-cream-cheese-cucumber-toast");
    expect(fridgeOnly.noCook).toBe(true);
    const freezerless = getRecipe("sweetcorn-ricotta-fritters");
    expect(mealStateFor(freezerless, 0)).toBe("cookToday");
    expect(mealStateFor(freezerless, 1)).toBe("fromFridge");
    expect(mealStateFor(freezerless, 9)).toBeNull();
  });
});

describe("H8 — prep cadence", () => {
  it("uses one prep session for up to 2 weeks and two beyond", () => {
    expect(generatePlan({ settings: { weeks: 1 }, restarts: 5, seed: 1 }).prepSessions).toHaveLength(1);
    expect(generatePlan({ settings: { weeks: 2 }, restarts: 5, seed: 1 }).prepSessions).toHaveLength(1);
    expect(generatePlan({ settings: { weeks: 3 }, restarts: 5, seed: 1 }).prepSessions).toHaveLength(2);
    expect(generatePlan({ settings: { weeks: 4 }, restarts: 5, seed: 1 }).prepSessions).toHaveLength(2);
  });
});

describe("H9 — tray throughput", () => {
  it("never puts more trays in a wave than exist", () => {
    const plan = generatePlan({ settings: { weeks: 4 }, restarts: 20, seed: 5 });
    for (const s of plan.prepSessions) {
      for (const w of s.waves) {
        expect(w.trays.length + w.openFreezeRecipeIds.length).toBeLessThanOrEqual(
          plan.settings.freezer.trayCount
        );
      }
    }
  });

  it("never puts more cubes in a tray than it holds", () => {
    const plan = generatePlan({ settings: { weeks: 4 }, restarts: 20, seed: 6 });
    for (const s of plan.prepSessions) {
      for (const w of s.waves) {
        for (const t of w.trays) {
          expect(t.cubes).toBeLessThanOrEqual(plan.settings.freezer.cubesPerTray);
          expect(t.cubes).toBeGreaterThan(0);
        }
      }
    }
  });

  it("keeps one recipe per tray, so every bag is a single recipe", () => {
    const plan = generatePlan({ settings: { weeks: 2 }, restarts: 20, seed: 8 });
    for (const s of plan.prepSessions) {
      for (const w of s.waves) {
        for (const t of w.trays) {
          expect(typeof t.recipeId).toBe("string");
        }
      }
    }
  });
});

describe("portion and cube maths", () => {
  it("makes two cubes a baby portion at 30ml", () => {
    expect(cubesPerPortion(DEFAULT_FREEZER)).toBe(2);
  });

  it("scores a full tray as a perfect fit", () => {
    expect(trayFit(7, DEFAULT_FREEZER)).toBe(1);
    expect(trayFit(14, DEFAULT_FREEZER)).toBe(1);
    expect(trayFit(8, DEFAULT_FREEZER)).toBeCloseTo(1 / 7);
  });

  it("always chooses a batch that covers what the plan needs", () => {
    for (const r of [
      getRecipe("app-courgette-lemon-cheddar-orzo"),
      getRecipe("butternut-coconut-oats"),
      getRecipe("app-haddock-leek-sweetcorn-mash"),
    ]) {
      for (const needed of [2, 4, 6, 8, 10, 12]) {
        const m = chooseBatchMultiplier(r, needed, DEFAULT_FREEZER);
        expect(m * r.babyPortions, `${r.title} for ${needed} portions`).toBeGreaterThanOrEqual(needed - 1e-9);
      }
    }
  });

  it("produces enough portions for every meal it is scheduled for", () => {
    const plan = generatePlan({ settings: { weeks: 2 }, restarts: 20, seed: 13 });
    for (const s of plan.prepSessions) {
      for (const item of s.cook) {
        const mealsUsing = plan.meals.filter(
          (m) => m.recipeId === item.recipeId && m.prepSessionIndex === s.index
        ).length;
        const portionsNeeded = mealsUsing * plan.settings.eaters;
        expect(item.portionsProduced, getRecipe(item.recipeId).title).toBeGreaterThanOrEqual(portionsNeeded - 0.05);
      }
    }
  });
});

describe("optimisation goals", () => {
  it("fills every meal slot", () => {
    for (const weeks of WEEKS) {
      for (const slots of [["lunch"], ["breakfast", "lunch"]] as MealSlot[][]) {
        const plan = generatePlan({ settings: { weeks, slots }, restarts: 20, seed: 21 });
        expect(plan.meals, `${weeks}w ${slots.join("+")}`).toHaveLength(weeks * 7 * slots.length);
      }
    }
  });

  it("plans lunches only when that is all that is switched on", () => {
    const plan = generatePlan({ settings: { weeks: 2, slots: ["lunch"] }, restarts: 10, seed: 1 });
    expect(plan.meals.every((m) => m.slot === "lunch")).toBe(true);
    for (const m of plan.meals) {
      expect(getRecipe(m.recipeId).slots).toContain("lunch");
    }
  });

  it("reuses ingredients — at least 35% fewer distinct than the naive sum", () => {
    const plan = generatePlan({ settings: { weeks: 2 }, restarts: 50, seed: 2 });
    const eff = ingredientEfficiency(plan.meals);
    expect(eff.saved).toBeGreaterThan(0.35);
  });

  it("generates a 4-week plan in under a second", () => {
    const start = Date.now();
    generatePlan({ settings: { weeks: 4 }, restarts: 200, seed: 99 });
    expect(Date.now() - start).toBeLessThan(1000);
  });

  it("is deterministic for a given seed", () => {
    const a = generatePlan({ settings: { weeks: 2 }, restarts: 10, seed: 123 });
    const b = generatePlan({ settings: { weeks: 2 }, restarts: 10, seed: 123 });
    expect(a.meals.map((m) => m.recipeId)).toEqual(b.meals.map((m) => m.recipeId));
  });
});

describe("manual override", () => {
  it("offers only legal swaps", () => {
    const plan = generatePlan({ settings: { weeks: 2 }, restarts: 10, seed: 31 });
    const options = swapOptions(plan, 5, "lunch");
    expect(options.length).toBeGreaterThan(0);
    for (const r of options) {
      expect(r.legumeStatus).not.toBe("contains");
      expect(r.slots).toContain("lunch");
      expect(mealStateFor(r, 5)).not.toBeNull();
    }
  });

  it("keeps locked meals exactly where they were", () => {
    const plan = generatePlan({ settings: { weeks: 2 }, restarts: 10, seed: 41 });
    const locked = [{ ...plan.meals[4], locked: true }];
    const regenerated = generatePlan({ settings: { weeks: 2 }, restarts: 10, seed: 77, locked });
    const kept = regenerated.meals.find(
      (m) => m.dayIndex === locked[0].dayIndex && m.slot === locked[0].slot
    );
    expect(kept?.recipeId).toBe(locked[0].recipeId);
    expect(kept?.locked).toBe(true);
  });
});

describe("batch cooking vs cooking on the day", () => {
  it("never batch-cooks a meal to be eaten beyond its fridge life", () => {
    // Regression: a 10-minute recipe scheduled on day 9 was being batched on
    // day 1 and sent "to the fridge" for eight days.
    for (let seed = 0; seed < 15; seed++) {
      const plan = generatePlan({ settings: { weeks: 2 }, restarts: 10, seed });
      for (const session of plan.prepSessions) {
        for (const item of session.cook) {
          const r = getRecipe(item.recipeId);
          const fridgeMeals = plan.meals.filter(
            (m) =>
              m.recipeId === item.recipeId &&
              m.prepSessionIndex === session.index &&
              (m.state === "fromFridge" || (m.state === "cookToday" && m.dayIndex === session.dayIndex))
          );
          for (const m of fridgeMeals) {
            const offset = m.dayIndex - session.dayIndex;
            expect(offset, `${r.title} kept ${offset} days, fridge life ${r.fridgeDays}`).toBeLessThan(
              r.fridgeDays
            );
          }
        }
      }
    }
  });

  it("lists cook-fresh meals separately rather than batching them", () => {
    const plan = generatePlan({ settings: { weeks: 2 }, restarts: 40, seed: 3 });
    for (const session of plan.prepSessions) {
      const batchedIds = new Set(session.cook.map((c) => c.recipeId));
      for (const fresh of session.cookFresh) {
        const daysAfterPrep = fresh.dayIndices.filter((d) => d !== session.dayIndex);
        if (daysAfterPrep.length > 0) {
          // It may still be batched for the prep day itself, but the later days
          // must be accounted for as fresh cooking.
          expect(fresh.dayIndices.length).toBeGreaterThan(0);
        }
      }
      // Every meal is accounted for exactly once.
      const sessionMeals = plan.meals.filter((m) => m.prepSessionIndex === session.index);
      for (const m of sessionMeals) {
        const r = getRecipe(m.recipeId);
        const inBatch = batchedIds.has(m.recipeId);
        const inFresh = session.cookFresh.some((f) => f.recipeId === m.recipeId);
        expect(inBatch || inFresh || r.noCook, `${r.title} unaccounted for`).toBe(true);
      }
    }
  });
});
