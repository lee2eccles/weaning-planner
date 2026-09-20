import { describe, it, expect } from "vitest";
import {
  MAX_DAYS, clampCoverage, convertCoverage, coverageBounds, coverageSummary, days,
  daysLabel, planDays, portions, portionsOvershoot, portionsPerDay, portionsPlanned, weeks,
} from "@/lib/planner/coverage";
import { generatePlan, DEFAULT_SETTINGS } from "@/lib/planner/generate";
import type { PlanSettings } from "@/lib/types";

const base: Pick<PlanSettings, "coverage" | "slots" | "eaters"> = {
  coverage: weeks(2),
  slots: ["lunch"],
  eaters: 2,
};

describe("coverage — asking for the same plan three ways", () => {
  it("counts weeks and days into the same number of days", () => {
    expect(planDays({ ...base, coverage: weeks(2) })).toBe(14);
    expect(planDays({ ...base, coverage: days(14) })).toBe(14);
    expect(planDays({ ...base, coverage: days(10) })).toBe(10);
  });

  it("turns a portions target into enough days to cover it", () => {
    // Two lunches a day for twins, so 28 portions is exactly a fortnight.
    expect(planDays({ ...base, coverage: portions(28) })).toBe(14);
    expect(portionsPlanned({ ...base, coverage: portions(28) })).toBe(28);
  });

  it("rounds a portions target up rather than leaving a day short", () => {
    const settings = { ...base, coverage: portions(29) };
    expect(planDays(settings)).toBe(15);
    expect(portionsPlanned(settings)).toBeGreaterThanOrEqual(29);
    expect(portionsOvershoot(settings)).toBe(1);
  });

  it("reports no overshoot when the target is not in portions", () => {
    expect(portionsOvershoot({ ...base, coverage: weeks(2) })).toBe(0);
  });

  it("counts both meal slots and every eater into a day's portions", () => {
    expect(portionsPerDay({ slots: ["lunch"], eaters: 2 })).toBe(2);
    expect(portionsPerDay({ slots: ["breakfast", "lunch"], eaters: 2 })).toBe(4);
    expect(portionsPlanned({ coverage: weeks(1), slots: ["breakfast", "lunch"], eaters: 2 })).toBe(28);
  });

  it("never plans beyond four weeks, however it is asked", () => {
    expect(planDays({ ...base, coverage: days(365) })).toBe(MAX_DAYS);
    expect(planDays({ ...base, coverage: weeks(52) })).toBe(MAX_DAYS);
    expect(planDays({ ...base, coverage: portions(10_000) })).toBe(MAX_DAYS);
  });

  it("never plans less than a day", () => {
    expect(planDays({ ...base, coverage: days(0) })).toBe(1);
    expect(planDays({ ...base, coverage: days(-5) })).toBe(1);
    expect(planDays({ ...base, coverage: portions(1) })).toBe(1);
  });

  it("survives a value that is not a number at all", () => {
    expect(planDays({ ...base, coverage: days(NaN) })).toBe(1);
  });

  it("keeps the same amount of food when the unit is switched", () => {
    const fortnight = { ...base, coverage: weeks(2) };
    expect(convertCoverage(fortnight, "days")).toEqual({ mode: "days", value: 14 });
    expect(convertCoverage(fortnight, "portions")).toEqual({ mode: "portions", value: 28 });
    expect(convertCoverage(fortnight, "weeks")).toEqual(fortnight.coverage);

    const asPortions = { ...base, coverage: portions(28) };
    expect(planDays({ ...asPortions, coverage: convertCoverage(asPortions, "days") })).toBe(14);
  });

  it("clamps a typed-in value to the bounds of its own unit", () => {
    expect(clampCoverage(weeks(99), base)).toEqual(weeks(4));
    expect(clampCoverage(days(0), base)).toEqual(days(1));
    const bounds = coverageBounds(base, "portions");
    expect(clampCoverage(portions(1), base)).toEqual(portions(bounds.min));
  });

  it("steps a portions target in whole days", () => {
    expect(coverageBounds({ slots: ["lunch"], eaters: 2 }, "portions").step).toBe(2);
    expect(coverageBounds({ slots: ["breakfast", "lunch"], eaters: 3 }, "portions").step).toBe(6);
  });

  it("says weeks when it is a round number of them", () => {
    expect(daysLabel(14)).toBe("2 weeks");
    expect(daysLabel(7)).toBe("1 week");
    expect(daysLabel(10)).toBe("1 week and 3 days");
    expect(daysLabel(23)).toBe("3 weeks and 2 days");
    expect(daysLabel(6)).toBe("6 days");
    expect(daysLabel(1)).toBe("1 day");
    expect(coverageSummary(base)).toBe("2 weeks · 28 portions");
  });
});

describe("coverage drives the plan itself", () => {
  it("builds exactly the number of days asked for", () => {
    for (const coverage of [days(3), days(10), weeks(1), weeks(3), portions(20)]) {
      const settings = { ...DEFAULT_SETTINGS, coverage };
      const plan = generatePlan({ settings, restarts: 5, seed: 3 });
      const planned = new Set(plan.meals.map((m) => m.dayIndex));
      expect(planned.size, JSON.stringify(coverage)).toBe(planDays(settings));
    }
  });

  it("produces at least the portions the target asked for", () => {
    for (const target of [12, 20, 29, 45]) {
      const settings = { ...DEFAULT_SETTINGS, coverage: portions(target) };
      const plan = generatePlan({ settings, restarts: 5, seed: 8 });
      expect(plan.meals.length * settings.eaters, `${target} portions`).toBeGreaterThanOrEqual(target);
    }
  });

  it("defaults to a fortnight, which is one prep session and one shop", () => {
    expect(planDays(DEFAULT_SETTINGS)).toBe(14);
  });
});
