import { describe, it, expect } from "vitest";
import {
  MAX_DAYS, clampMeals, coverageSummary, daysLabel, maxMeals, mealPresets, mealStep, mealWord,
  mealsOvershoot, mealsPlanned, planDays, portionsPlanned, slotsPerDay,
} from "@/lib/planner/coverage";
import { generatePlan, DEFAULT_SETTINGS } from "@/lib/planner/generate";
import type { PlanSettings } from "@/lib/types";

const twins: Pick<PlanSettings, "meals" | "slots" | "eaters"> = {
  meals: 14,
  slots: ["lunch"],
  eaters: 2,
};

describe("asking for a number of meals", () => {
  it("treats one meal as one day when only lunch is planned", () => {
    // "I only need four lunches this week" is a complete brief.
    expect(planDays({ ...twins, meals: 4 })).toBe(4);
    expect(mealsPlanned({ ...twins, meals: 4 })).toBe(4);
  });

  it("feeds everyone eating from each meal", () => {
    expect(portionsPlanned({ ...twins, meals: 4 })).toBe(8);
    expect(portionsPlanned({ ...twins, meals: 4, eaters: 1 })).toBe(4);
    expect(portionsPlanned({ ...twins, meals: 4, eaters: 3 })).toBe(12);
  });

  it("counts two meals to the day when breakfast is on too", () => {
    const both = { ...twins, slots: ["breakfast", "lunch"] as PlanSettings["slots"] };
    expect(slotsPerDay(both)).toBe(2);
    expect(planDays({ ...both, meals: 4 })).toBe(2);
    expect(portionsPlanned({ ...both, meals: 4 })).toBe(8);
  });

  it("rounds a half day up, and says by how much", () => {
    const both = { ...twins, slots: ["breakfast", "lunch"] as PlanSettings["slots"], meals: 3 };
    expect(planDays(both)).toBe(2);
    expect(mealsPlanned(both)).toBe(4);
    expect(mealsOvershoot(both)).toBe(1);
    expect(mealsOvershoot({ ...twins, meals: 4 })).toBe(0);
  });

  it("allows a single meal — the smallest real ask", () => {
    expect(planDays({ ...twins, meals: 1 })).toBe(1);
    expect(clampMeals(1, twins)).toBe(1);
    expect(clampMeals(0, twins)).toBe(1);
    expect(clampMeals(-4, twins)).toBe(1);
  });

  it("never plans past four weeks of food", () => {
    expect(maxMeals(twins)).toBe(MAX_DAYS);
    expect(planDays({ ...twins, meals: 999 })).toBe(MAX_DAYS);
    const both = { ...twins, slots: ["breakfast", "lunch"] as PlanSettings["slots"] };
    expect(maxMeals(both)).toBe(MAX_DAYS * 2);
    expect(planDays({ ...both, meals: 999 })).toBe(MAX_DAYS);
  });

  it("survives a value that is not a number", () => {
    expect(planDays({ ...twins, meals: NaN })).toBe(1);
  });

  it("names the thing it is counting", () => {
    expect(mealWord({ slots: ["lunch"] }, 4)).toBe("lunches");
    expect(mealWord({ slots: ["lunch"] }, 1)).toBe("lunch");
    expect(mealWord({ slots: ["breakfast"] }, 3)).toBe("breakfasts");
    expect(mealWord({ slots: ["breakfast", "lunch"] }, 3)).toBe("meals");
  });

  it("summarises in the words that were asked", () => {
    expect(coverageSummary({ ...twins, meals: 4 })).toBe("4 lunches · 8 baby portions");
    expect(coverageSummary({ ...twins, meals: 1, eaters: 1 })).toBe("1 lunch · 1 baby portion");
  });

  it("still describes long plans in weeks", () => {
    expect(daysLabel(14)).toBe("2 weeks");
    expect(daysLabel(10)).toBe("1 week and 3 days");
    expect(daysLabel(4)).toBe("4 days");
  });
});

describe("the sizes the card offers", () => {
  const both = { slots: ["breakfast", "lunch"] as PlanSettings["slots"] };

  it("offers the same four spans whichever meals are planned", () => {
    expect(mealPresets({ slots: ["lunch"] }).map((p) => p.days)).toEqual([4, 7, 14, 28]);
    expect(mealPresets(both).map((p) => p.days)).toEqual([4, 7, 14, 28]);
  });

  it("counts them in the unit the question is asked in", () => {
    expect(mealPresets({ slots: ["lunch"] }).map((p) => p.meals)).toEqual([4, 7, 14, 28]);
    expect(mealPresets(both).map((p) => p.meals)).toEqual([8, 14, 28, 56]);
  });

  it("never offers a size the planner would then change", () => {
    // "7 meals" used to sit highlighted as the chosen size above a summary
    // that said 8. Every preset is a whole number of days by construction.
    for (const slots of [["lunch"], ["breakfast"], ["breakfast", "lunch"]] as PlanSettings["slots"][]) {
      for (const preset of mealPresets({ slots })) {
        const settings = { ...twins, slots, meals: preset.meals };
        expect(mealsOvershoot(settings), `${preset.meals} across ${slots.length} slots`).toBe(0);
        expect(mealsPlanned(settings)).toBe(preset.meals);
        expect(planDays(settings)).toBe(preset.days);
        expect(preset.meals).toBeLessThanOrEqual(maxMeals({ slots }));
      }
    }
  });

  it("steps by a whole day, so the buttons cannot round either", () => {
    expect(mealStep({ slots: ["lunch"] })).toBe(1);
    expect(mealStep(both)).toBe(2);
  });
});

describe("the meal count drives the plan itself", () => {
  it("plans exactly the meals asked for", () => {
    for (const meals of [1, 4, 7, 10, 28]) {
      const settings = { ...DEFAULT_SETTINGS, meals };
      const plan = generatePlan({ settings, restarts: 5, seed: 3 });
      expect(plan.meals.length, `${meals} meals`).toBe(meals);
      expect(new Set(plan.meals.map((m) => m.dayIndex)).size).toBe(planDays(settings));
    }
  });

  it("makes four lunches into four days of one meal, not four days of two", () => {
    const plan = generatePlan({ settings: { ...DEFAULT_SETTINGS, meals: 4 }, restarts: 5, seed: 2 });
    expect(plan.meals).toHaveLength(4);
    expect(plan.meals.every((m) => m.slot === "lunch")).toBe(true);
    expect(plan.prepSessions).toHaveLength(1);
  });

  it("covers both slots when both are planned", () => {
    const plan = generatePlan({
      settings: { ...DEFAULT_SETTINGS, meals: 4, slots: ["breakfast", "lunch"] },
      restarts: 5, seed: 4,
    });
    expect(plan.meals).toHaveLength(4);
    expect(new Set(plan.meals.map((m) => m.dayIndex)).size).toBe(2);
  });

  it("defaults to a fortnight of lunches", () => {
    expect(DEFAULT_SETTINGS.meals).toBe(14);
    expect(planDays(DEFAULT_SETTINGS)).toBe(14);
  });
});
