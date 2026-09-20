import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/planner/generate";
import { buildShoppingLists, shoppingListToText, planToText } from "@/lib/shopping/merge";
import { getRecipe, ALL_RECIPES } from "@/lib/data/recipes";
import { cubesPerPortion, scaleIngredients, scaleQuantity, batchLabel, DEFAULT_FREEZER } from "@/lib/planner/portions";
import { prepSessionToText, recipeToText } from "@/lib/text/export";
import { searchRecipes } from "@/lib/data/search";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Regressions from the three parent test sessions. Each of these was a real
 * thing a tester hit, and each is the sort of quiet wrongness that destroys
 * trust in everything else on the screen.
 */
describe("what the parent testers found", () => {
  it("writes a plan in day numbers, with no calendar in it", () => {
    const plan = generatePlan({ settings: { meals: 7 }, restarts: 5, seed: 1 });
    const text = planToText(plan);
    expect(text).toContain("Day 1");
    expect(text).toContain("Day 7");
    // No weekday names, no dates: the plan starts whenever you start it.
    for (const day of DAY_NAMES) expect(text).not.toContain(day);
    expect(text).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  });

  it("tells you the days a shop actually covers", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 4 });
    const lists = buildShoppingLists(plan);
    const last = lists[lists.length - 1];
    const planDaysCovered = Math.max(...plan.meals.map((m) => m.dayIndex));

    // The prep-day shop buys for the whole session, so the ranges together must
    // reach the end of the plan — "Days 1–7" on a fortnight sent a tester home.
    expect(last.coversDays[1]).toBe(planDaysCovered);
    for (const l of lists) expect(l.coversDays[1]).toBeGreaterThanOrEqual(l.coversDays[0]);
  });

  it("never labels two shopping lists the same thing", () => {
    for (const seed of [1, 2, 3]) {
      const plan = generatePlan({ settings: { meals: 28 }, restarts: 5, seed });
      const labels = buildShoppingLists(plan).map((l) => l.label);
      expect(new Set(labels).size, labels.join(" | ")).toBe(labels.length);
    }
  });

  it("copies what is left, not what you started with", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 5 });
    const list = buildShoppingLists(plan)[0];
    const first = list.lines[0];
    const ticked = new Set([`${list.shopIndex}:${first.item}`]);

    const full = shoppingListToText(list, true);
    const remaining = shoppingListToText(list, true, ticked);

    expect(full.split("\n- ").length).toBe(remaining.split("\n- ").length + 1);
    expect(remaining).toContain("already in the trolley");
    // Aisle headings are most of the list's value, so the text keeps them.
    expect(remaining).toContain("Fruit & veg:");
  });

  it("counts open-frozen food in portions and ice-cube food in cubes", () => {
    for (const seed of [1, 4, 9]) {
      const plan = generatePlan({
        settings: { meals: 28, slots: ["breakfast", "lunch"] }, restarts: 20, seed,
      });
      for (const session of plan.prepSessions) {
        for (const item of session.cook) {
          const r = getRecipe(item.recipeId);
          if (r.freezeFormat === "cube") {
            expect(item.toFreezerPortions, r.title).toBe(0);
          } else {
            // Pancakes are not cubes, and calling them cubes overstated the
            // tray work by more than double.
            expect(item.toFreezerCubes, r.title).toBe(0);
          }
        }

        // Every cube counted must fit in the trays the waves actually assign.
        const cubes = session.cook.reduce((n, c) => n + c.toFreezerCubes, 0);
        const inTrays = session.waves.reduce(
          (n, w) => n + w.trays.reduce((m, t) => m + t.cubes, 0),
          0
        );
        expect(inTrays, `seed ${seed}`).toBe(cubes);
      }
    }
  });

  it("gives every defrosted meal a number to take out", () => {
    const plan = generatePlan({
      settings: { meals: 28, slots: ["breakfast", "lunch"] }, restarts: 20, seed: 3,
    });
    for (const m of plan.meals.filter((x) => x.state === "defrost")) {
      const r = getRecipe(m.recipeId);
      if (r.freezeFormat === "cube") {
        expect(m.cubesToDefrost, r.title).toBeGreaterThan(0);
      } else {
        expect(m.portionsToDefrost, r.title).toBeGreaterThan(0);
      }
    }
  });

  it("leans towards saved recipes without letting them take over", () => {
    const settings = { meals: 14 };
    const plain = generatePlan({ settings, restarts: 30, seed: 11 });
    const favourite = plain.meals[5].recipeId;

    const preferred = generatePlan({
      settings, restarts: 30, seed: 11, preferred: [favourite],
    });

    const count = (p: typeof plain) => p.meals.filter((m) => m.recipeId === favourite).length;
    expect(count(preferred)).toBeGreaterThanOrEqual(count(plain));
    // Variety still holds — a saved recipe cannot appear more than twice a week.
    const perWeek = new Map<string, number>();
    for (const m of preferred.meals) {
      const key = `${Math.floor(m.dayIndex / 7)}:${m.recipeId}`;
      perWeek.set(key, (perWeek.get(key) ?? 0) + 1);
    }
    for (const n of perWeek.values()) expect(n).toBeLessThanOrEqual(2);
  });
});

describe("cooking from the prep sheet", () => {
  it("scales quantities to the batch, rounding to something you can measure", () => {
    expect(scaleQuantity(250, "g", 3)).toBe(750);
    expect(scaleQuantity(83, "g", 1.5)).toBe(125); // 124.5 → nearest 5
    expect(scaleQuantity(2, "tsp", 0.5)).toBe(1);
    expect(scaleQuantity(1, "piece", 1.5)).toBe(1.5);
    expect(scaleQuantity(null, "pinch", 3)).toBeNull();
    expect(scaleQuantity(4, "g", 2)).toBe(8); // small amounts stay exact
  });

  it("scales every ingredient of a recipe together", () => {
    const r = getRecipe("quick-beef-tomato-pasta");
    const scaled = scaleIngredients(r, 2);
    for (const [i, ing] of scaled.entries()) {
      const original = r.ingredients[i].quantity;
      if (original == null) expect(ing.quantity).toBeNull();
      else expect(ing.quantity).toBeGreaterThan(original);
    }
    // Unscaled is the same array, so a 1× render costs nothing.
    expect(scaleIngredients(r, 1)).toBe(r.ingredients);
  });

  it("says the batch the way a person would", () => {
    expect(batchLabel(1)).toBe("Single batch");
    expect(batchLabel(0.5)).toBe("Half batch");
    expect(batchLabel(3)).toBe("3× batch");
  });

  it("writes a prep sheet you can cook from with the app closed", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 7 });
    const session = plan.prepSessions[0];
    const text = prepSessionToText(session, getRecipe, cubesPerPortion(DEFAULT_FREEZER));

    expect(text).toContain("COOK");
    for (const item of session.cook) {
      const r = getRecipe(item.recipeId);
      expect(text).toContain(r.title);
      // The scaled amount must be in the text, not the single-batch one.
      const measured = scaleIngredients(r, item.batchMultiplier).find(
        (i) => i.quantity != null && (i.unit === "g" || i.unit === "ml")
      );
      if (measured) expect(text).toContain(`${measured.quantity}${measured.unit}`);
    }
    expect(text).toContain("Never refreeze");
  });

  it("exports a recipe at the batch it is being cooked at", () => {
    const r = getRecipe("quick-mackerel-potato-sweetcorn-smash");
    const text = recipeToText(r, undefined, 3);
    expect(text).toContain("3× batch");
    expect(text).toContain("750g potato"); // 250g × 3
    expect(recipeToText(r)).toContain("250g potato");
  });
});

describe("what happened at the shop reaches the hob", () => {
  const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 7 });
  const session = plan.prepSessions[0];
  const shopped = getRecipe(session.cook[0].recipeId).ingredients[0].item;

  it("writes a substitution onto the shopping list text", () => {
    const list = buildShoppingLists(plan)[0];
    const item = list.lines[0].item;
    const text = shoppingListToText(list, true, undefined, { [item]: "pollock instead" });
    expect(text).toContain("(pollock instead)");
  });

  it("carries it to the recipe that needs that ingredient on prep day", () => {
    const text = prepSessionToText(session, getRecipe, cubesPerPortion(DEFAULT_FREEZER), {
      [shopped]: "Out of stock",
    });
    expect(text).toContain("[shop note: Out of stock]");
    // Against the right recipe, not merely somewhere in the sheet.
    const recipeBlock = text.slice(text.indexOf(getRecipe(session.cook[0].recipeId).title));
    expect(recipeBlock).toContain("Out of stock");
  });

  it("reaches only the recipes that actually use the ingredient", () => {
    const swapped = "chives";
    const text = prepSessionToText(session, getRecipe, cubesPerPortion(DEFAULT_FREEZER), {
      [swapped]: "Out of stock",
    });

    for (const item of session.cook) {
      const r = getRecipe(item.recipeId);
      const uses = r.ingredients.some((i) => i.item === swapped);
      // Slice out this recipe's own block of the sheet.
      const start = text.indexOf(r.title);
      const nextTitles = session.cook
        .map((c) => text.indexOf(getRecipe(c.recipeId).title))
        .filter((i) => i > start);
      const block = text.slice(start, nextTitles.length ? Math.min(...nextTitles) : undefined);
      expect(block.includes("shop note"), `${r.title} uses ${swapped}: ${uses}`).toBe(uses);
    }
  });

  it("leaves the sheet unchanged when nothing was substituted", () => {
    const withSwaps = prepSessionToText(session, getRecipe, cubesPerPortion(DEFAULT_FREEZER), {});
    const without = prepSessionToText(session, getRecipe, cubesPerPortion(DEFAULT_FREEZER));
    expect(withSwaps).toBe(without);
    expect(without).not.toContain("shop note");
  });
});

describe("search after the sentence-length queries testers actually typed", () => {
  it("still answers when one word matches nothing", () => {
    const results = searchRecipes(ALL_RECIPES, "that mackerel thing we liked");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title.toLowerCase()).toContain("mackerel");
  });

  it("prefers the recipes matching the most words", () => {
    const results = searchRecipes(ALL_RECIPES, "sweetcorn mackerel nonsenseword");
    expect(results[0].id).toBe("quick-mackerel-potato-sweetcorn-smash");
  });

  it("still returns nothing when nothing matches at all", () => {
    expect(searchRecipes(ALL_RECIPES, "kangaroo")).toEqual([]);
  });
});
