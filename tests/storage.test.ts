import { describe, it, expect } from "vitest";
import { migrateStored, SCHEMA_VERSION } from "@/lib/storage/local";
import { planDays } from "@/lib/planner/coverage";

/**
 * A saved plan carries the shopping ticks and the record of which allergens the
 * twins have already met. Throwing that away on an upgrade is a real cost to a
 * real person, so the v1 week count is carried across rather than discarded.
 */
describe("storage migration", () => {
  const v1 = {
    version: 1,
    settings: { weeks: 3, slots: ["lunch"], eaters: 2, prepDayIndex: 6, ageBandMonths: 9 },
    plan: {
      id: "plan-1",
      startDate: "2026-09-01",
      settings: { weeks: 3, slots: ["lunch"], eaters: 2, prepDayIndex: 6, ageBandMonths: 9 },
      meals: [],
      prepSessions: [],
      warnings: [],
    },
    allergensSeen: ["milk"],
    eaten: ["0:lunch"],
    ticked: ["0:pear"],
  };

  it("turns a v1 week count into a coverage target meaning the same thing", () => {
    const out = migrateStored(structuredClone(v1));
    expect(out.version).toBe(SCHEMA_VERSION);
    // Three weeks of lunches is twenty-one lunches.
    expect(out.settings!.meals).toBe(21);
    expect(planDays(out.settings!)).toBe(21);
    expect((out.settings as unknown as Record<string, unknown>).weeks).toBeUndefined();
  });

  it("migrates the saved plan's own settings too", () => {
    const out = migrateStored(structuredClone(v1));
    expect(out.plan!.settings.meals).toBe(21);
    expect(planDays(out.plan!.settings)).toBe(21);
  });

  it("keeps what the parent had already recorded", () => {
    const out = migrateStored(structuredClone(v1));
    expect(out.allergensSeen).toEqual(["milk"]);
    expect(out.eaten).toEqual(["0:lunch"]);
    expect(out.ticked).toEqual(["0:pear"]);
  });

  it("starts the saved list and notes empty rather than undefined", () => {
    const out = migrateStored(structuredClone(v1));
    expect(out.saved).toEqual([]);
    expect(out.notes).toEqual({});
    expect(out.swaps).toEqual({});
  });

  it("passes a current blob through untouched", () => {
    const current = {
      version: SCHEMA_VERSION,
      plan: null,
      settings: null,
      allergensSeen: [],
      eaten: [],
      ticked: [],
      saved: ["quick-sardine-tomato-toast"],
      notes: { "quick-sardine-tomato-toast": "good" },
      cooked: ["0:quick-sardine-tomato-toast"],
      shop: { listIndex: 1, hideStaples: false },
      swaps: { haddock: "pollock instead" },
    };
    expect(migrateStored(current)).toEqual(current);
  });

  it("carries a v3 blob forward, keeping the prep ticks and shop position", () => {
    const v3 = {
      version: 3,
      plan: null,
      settings: null,
      allergensSeen: [],
      eaten: [],
      ticked: ["0:pear"],
      saved: ["quick-sardine-tomato-toast"],
      notes: { "quick-sardine-tomato-toast": "good" },
      cooked: ["0:quick-sardine-tomato-toast"],
      shop: { listIndex: 2, hideStaples: false },
    };
    const out = migrateStored(v3);
    expect(out.version).toBe(SCHEMA_VERSION);
    expect(out.cooked).toEqual(["0:quick-sardine-tomato-toast"]);
    expect(out.shop).toEqual({ listIndex: 2, hideStaples: false });
    expect(out.saved).toEqual(["quick-sardine-tomato-toast"]);
    // New in v4.
    expect(out.swaps).toEqual({});
  });

  it("carries a v2 blob forward, keeping the saved list and notes", () => {
    const v2 = {
      version: 2,
      plan: null,
      settings: null,
      allergensSeen: ["eggs"],
      eaten: [],
      ticked: ["0:pear"],
      saved: ["quick-sardine-tomato-toast"],
      notes: { "quick-sardine-tomato-toast": "went down well" },
    };
    const out = migrateStored(v2);
    expect(out.version).toBe(SCHEMA_VERSION);
    expect(out.saved).toEqual(["quick-sardine-tomato-toast"]);
    expect(out.notes).toEqual({ "quick-sardine-tomato-toast": "went down well" });
    expect(out.ticked).toEqual(["0:pear"]);
    // New in v3, so it starts empty rather than undefined.
    expect(out.cooked).toEqual([]);
    expect(out.shop).toEqual({ listIndex: 0, hideStaples: true });
  });

  it("gives up safely on a version it does not know", () => {
    const out = migrateStored({ version: 99, saved: ["x"] });
    expect(out.version).toBe(SCHEMA_VERSION);
    expect(out.plan).toBeNull();
    expect(out.saved).toEqual([]);
  });

  it("survives a v1 blob with no plan or settings at all", () => {
    const out = migrateStored({ version: 1, allergensSeen: ["eggs"] });
    expect(out.plan).toBeNull();
    expect(out.settings).toBeNull();
    expect(out.allergensSeen).toEqual(["eggs"]);
  });
});
