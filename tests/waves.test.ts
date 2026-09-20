import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/planner/generate";
import { DEFAULT_FREEZER } from "@/lib/planner/portions";

/**
 * A fortnight is 56 baby portions. Freezing all of it would need three waves of
 * six trays, which is an unreasonably long prep day. The planner is supposed to
 * relieve that by using the cook-fresh and no-cook pool.
 */
describe("freezer demand for a fortnight", () => {
  it("keeps a fortnight inside three freezing waves", () => {
    // 56 baby portions a fortnight is roughly 60 cubes once fridge meals and
    // open-frozen items are taken out — two to three waves of 42. Three is
    // workable because the later waves run overnight, with the food waiting in
    // the fridge. Four would not be.
    for (let seed = 0; seed < 20; seed++) {
      const plan = generatePlan({ settings: { meals: 14 }, restarts: 40, seed });
      for (const session of plan.prepSessions) {
        expect(session.waves.length, `seed ${seed} needs ${session.waves.length} waves`).toBeLessThanOrEqual(3);
      }
    }
  });

  it("needs fewer waves when there are more trays", () => {
    const few = generatePlan({
      settings: { meals: 14, freezer: { ...DEFAULT_FREEZER, trayCount: 3 } },
      restarts: 20, seed: 1,
    });
    const many = generatePlan({
      settings: { meals: 14, freezer: { ...DEFAULT_FREEZER, trayCount: 12 } },
      restarts: 20, seed: 1,
    });
    expect(many.prepSessions[0].waves.length).toBeLessThan(few.prepSessions[0].waves.length);
  });

  it("uses the fresh and no-cook pool when the freezer is under pressure", () => {
    // Freezer pressure only bites when both meals are planned; lunches alone
    // fit comfortably, and the planner should not pad with toast for no reason.
    const plan = generatePlan({
      settings: { meals: 28, slots: ["breakfast", "lunch"] },
      restarts: 40, seed: 3,
    });
    const fresh = plan.meals.filter((m) => m.state === "noCook" || m.state === "cookToday").length;
    expect(fresh / plan.meals.length, "expected a meaningful share of fresh meals").toBeGreaterThan(0.15);
  });

  it("needs fewer waves for lunches alone than for both meals", () => {
    const lunchOnly = generatePlan({ settings: { meals: 14, slots: ["lunch"] }, restarts: 20, seed: 2 });
    const both = generatePlan({
      settings: { meals: 28, slots: ["breakfast", "lunch"] }, restarts: 20, seed: 2,
    });
    const waves = (p: typeof lunchOnly) => Math.max(...p.prepSessions.map((s) => s.waves.length));
    expect(waves(lunchOnly)).toBeLessThanOrEqual(waves(both));
  });
});

describe("the plan is actually batch-cooked", () => {
  it("does not let cold-assembly meals take over", () => {
    // Over-weighting freezer relief made no-cook meals win on every term at
    // once, and four of seven lunches became toast.
    for (let seed = 0; seed < 15; seed++) {
      const plan = generatePlan({
        settings: { meals: 28, slots: ["breakfast", "lunch"] }, restarts: 30, seed,
      });
      const noCook = plan.meals.filter((m) => m.state === "noCook").length;
      expect(noCook / plan.meals.length, `seed ${seed} is mostly assembly`).toBeLessThan(0.3);
    }
  });

  it("gets most meals from the freezer or fridge", () => {
    for (let seed = 0; seed < 15; seed++) {
      const plan = generatePlan({
        settings: { meals: 28, slots: ["breakfast", "lunch"] }, restarts: 30, seed,
      });
      const stored = plan.meals.filter((m) => m.state === "defrost" || m.state === "fromFridge").length;
      expect(stored / plan.meals.length, `seed ${seed} barely uses the batch cooking`).toBeGreaterThan(0.5);
    }
  });
});
