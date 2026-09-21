import { describe, it, expect } from "vitest";
import { generatePlan, DEFAULT_SETTINGS } from "@/lib/planner/generate";
import { ineligibleReason, isBatchCooked, sessionForDay } from "@/lib/planner/constraints";
import { cubesPerPortion, scaleIngredients } from "@/lib/planner/portions";
import { mealsPlanned, planDays, slotsPerDay } from "@/lib/planner/coverage";
import { buildShoppingLists } from "@/lib/shopping/merge";
import { getRecipe, PLANNABLE_RECIPES as ALL_RECIPES } from "@/lib/data/recipes";
import type { MealSlot, PlanSettings } from "@/lib/types";

const SLOTS: MealSlot[][] = [["lunch"], ["breakfast"], ["breakfast", "lunch"]];
const MEALS = [1, 2, 3, 5, 7, 8, 14, 15, 28, 29, 56];
const EATERS = [1, 2, 4, 8];
const AGES = [6, 7, 9, 10, 12];

function cases(): PlanSettings[] {
  const out: PlanSettings[] = [];
  for (const slots of SLOTS)
    for (const meals of MEALS)
      for (const eaters of [2])
        out.push({ ...DEFAULT_SETTINGS, slots, meals, eaters });
  for (const eaters of EATERS)
    for (const ageBandMonths of AGES)
      out.push({ ...DEFAULT_SETTINGS, slots: ["breakfast", "lunch"], meals: 14, eaters, ageBandMonths });
  return out;
}

/**
 * A sweep over every plan the interface can actually ask for.
 *
 * These are the promises the prep sheet and the shopping list are built on —
 * that the food cooked covers the meals planned, that nothing is defrosted
 * that was never frozen, that every ingredient reaches a list. A single plan
 * shape passing says little; the combinations are where they break.
 */
describe("every plan the interface can ask for", () => {
  const all = cases();

  it("fills every meal it was asked for, or says why not", () => {
    for (const settings of all) {
      const plan = generatePlan({ settings, restarts: 8, seed: 11 });
      const want = mealsPlanned(settings);
      const label = `${settings.slots.join("+")} age${settings.ageBandMonths}`;
      if (plan.meals.length !== want) {
        // Short is allowed — the library genuinely has no lunch at 6+ months —
        // but never silently.
        expect(plan.meals.length, label).toBeLessThan(want);
        expect(plan.warnings.join(" "), `${label} filled short without a warning`).toMatch(
          /could not be filled/
        );
      }
      const days = new Set(plan.meals.map((m) => m.dayIndex));
      expect(days.size).toBeLessThanOrEqual(planDays(settings));
      for (const m of plan.meals) {
        expect(m.dayIndex).toBeGreaterThanOrEqual(0);
        expect(m.dayIndex).toBeLessThan(planDays(settings));
        expect(settings.slots).toContain(m.slot);
        expect(m.prepSessionIndex).toBe(sessionForDay(m.dayIndex));
      }
    }
  });

  it("never breaks a hard constraint it planned around", () => {
    for (const settings of all) {
      const plan = generatePlan({ settings, restarts: 8, seed: 5 });
      for (const m of plan.meals) {
        const others = plan.meals.filter((x) => !(x.dayIndex === m.dayIndex && x.slot === m.slot));
        const why = ineligibleReason(getRecipe(m.recipeId), {
          meals: others, dayIndex: m.dayIndex, slot: m.slot, settings,
        });
        expect(why, `${m.recipeId} on day ${m.dayIndex} ${m.slot}: ${why}`).toBeNull();
      }
    }
  });

  it("never asks you to defrost food it did not freeze", () => {
    for (const settings of all) {
      const plan = generatePlan({ settings, restarts: 8, seed: 7 });
      for (const session of plan.prepSessions) {
        const frozen = new Map<string, number>();
        for (const c of session.cook) frozen.set(c.recipeId, c.toFreezerCubes);
        const flat = new Map<string, number>();
        for (const c of session.cook) flat.set(c.recipeId, c.toFreezerPortions);
        const wantCubes = new Map<string, number>();
        const wantFlat = new Map<string, number>();
        for (const m of plan.meals.filter((x) => x.prepSessionIndex === session.index)) {
          if (m.state !== "defrost") continue;
          if (m.cubesToDefrost) wantCubes.set(m.recipeId, (wantCubes.get(m.recipeId) ?? 0) + m.cubesToDefrost);
          if (m.portionsToDefrost) wantFlat.set(m.recipeId, (wantFlat.get(m.recipeId) ?? 0) + m.portionsToDefrost);
        }
        for (const [id, want] of wantCubes) {
          expect(frozen.get(id) ?? 0, `${id} cubes in session ${session.index}`).toBeGreaterThanOrEqual(want);
        }
        for (const [id, want] of wantFlat) {
          expect(flat.get(id) ?? 0, `${id} flat portions in session ${session.index}`).toBeGreaterThanOrEqual(want);
        }
      }
    }
  });

  it("cooks enough food for every meal it planned", () => {
    for (const settings of all) {
      const plan = generatePlan({ settings, restarts: 8, seed: 3 });
      for (const session of plan.prepSessions) {
        const sessionMeals = plan.meals.filter((m) => m.prepSessionIndex === session.index);
        for (const c of session.cook) {
          const needed = sessionMeals.filter(
            (m) => m.recipeId === c.recipeId && isBatchCooked(getRecipe(m.recipeId), m.dayIndex)
          ).length * settings.eaters;
          expect(c.portionsProduced + 1e-9, `${c.recipeId} portions`).toBeGreaterThanOrEqual(needed);
        }
      }
    }
  });

  it("puts every meal on the prep sheet somewhere", () => {
    for (const settings of all) {
      const plan = generatePlan({ settings, restarts: 8, seed: 9 });
      for (const m of plan.meals) {
        const s = plan.prepSessions[m.prepSessionIndex];
        const onSheet =
          s.cook.some((c) => c.recipeId === m.recipeId) ||
          s.cookFresh.some((c) => c.recipeId === m.recipeId);
        expect(onSheet, `${m.recipeId} day ${m.dayIndex} missing from prep session ${s.index}`).toBe(true);
      }
    }
  });

  it("shops for every ingredient of every recipe it planned", () => {
    for (const settings of all) {
      const plan = generatePlan({ settings, restarts: 8, seed: 13 });
      const lists = buildShoppingLists(plan);
      for (const session of plan.prepSessions) {
        const wanted = new Set<string>();
        for (const m of plan.meals.filter((x) => x.prepSessionIndex === session.index)) {
          for (const i of getRecipe(m.recipeId).ingredients) wanted.add(i.item);
        }
        const got = new Set<string>();
        for (const l of lists.filter((l) => l.sessionIndex === session.index)) {
          for (const line of l.lines) got.add(line.item);
        }
        for (const item of wanted) expect(got.has(item), `${item} never reaches the shopping list`).toBe(true);
      }
      for (const l of lists) {
        for (const line of l.lines) {
          for (const a of line.amounts) {
            expect(Number.isNaN(a.quantity ?? 0), `${line.item} NaN quantity`).toBe(false);
            if (a.quantity != null) expect(a.quantity).toBeGreaterThan(0);
          }
          expect(line.usedIn.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it("scales every recipe without producing nonsense", () => {
    for (const settings of [DEFAULT_SETTINGS]) {
      const plan = generatePlan({ settings, restarts: 8, seed: 21 });
      for (const session of plan.prepSessions) {
        for (const c of session.cook) {
          for (const i of scaleIngredients(getRecipe(c.recipeId), c.batchMultiplier)) {
            if (i.quantity != null) {
              expect(Number.isFinite(i.quantity)).toBe(true);
              expect(i.quantity).toBeGreaterThan(0);
            }
          }
          expect(c.batchMultiplier).toBeGreaterThanOrEqual(0.5);
          expect(c.batchMultiplier * 2).toBe(Math.round(c.batchMultiplier * 2));
        }
      }
    }
  });

  it("keeps locked meals through a rebuild", () => {
    const settings = { ...DEFAULT_SETTINGS, meals: 14 };
    const plan = generatePlan({ settings, restarts: 8, seed: 31 });
    const locked = plan.meals.slice(0, 3).map((m) => ({ ...m, locked: true }));
    const rebuilt = generatePlan({ settings, locked, restarts: 8, seed: 32 });
    for (const l of locked) {
      const found = rebuilt.meals.find((m) => m.dayIndex === l.dayIndex && m.slot === l.slot);
      expect(found?.recipeId).toBe(l.recipeId);
      expect(found?.locked).toBe(true);
    }
    expect(rebuilt.meals.length).toBe(plan.meals.length);
  });

  it("survives every recipe being ruled out", () => {
    const blocked = ALL_RECIPES.map((r) => r.id);
    const plan = generatePlan({ settings: DEFAULT_SETTINGS, blocked, restarts: 4, seed: 41 });
    expect(plan.meals).toHaveLength(0);
    expect(() => buildShoppingLists(plan)).not.toThrow();
  });

  it("generates the largest possible plan without stalling", () => {
    const settings: PlanSettings = {
      ...DEFAULT_SETTINGS, slots: ["breakfast", "lunch"], meals: 56, eaters: 8,
    };
    const t0 = Date.now();
    const plan = generatePlan({ settings });
    const ms = Date.now() - t0;
    expect(plan.meals).toHaveLength(56);
    // The solve is synchronous and blocks the tap that started it. 200
    // restarts of the largest plan measured ~650ms on this machine.
    expect(ms).toBeLessThan(8000);
  });

  it("defrost instructions match the eaters", () => {
    for (const eaters of EATERS) {
      const settings = { ...DEFAULT_SETTINGS, meals: 28, eaters };
      const plan = generatePlan({ settings, restarts: 8, seed: 51 });
      for (const m of plan.meals) {
        if (m.state !== "defrost") continue;
        const r = getRecipe(m.recipeId);
        if (r.freezeFormat === "cube") {
          expect(m.cubesToDefrost).toBe(cubesPerPortion(settings.freezer) * eaters);
          expect(m.portionsToDefrost).toBeUndefined();
        } else {
          expect(m.portionsToDefrost).toBe(eaters);
          expect(m.cubesToDefrost).toBeUndefined();
        }
      }
    }
  });
});
