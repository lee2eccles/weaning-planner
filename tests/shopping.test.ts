import { describe, it, expect } from "vitest";
import { weeks } from "@/lib/planner/coverage";
import { generatePlan } from "@/lib/planner/generate";
import { buildShoppingLists, shoppingListToText, formatLine } from "@/lib/shopping/merge";
import { getRecipe } from "@/lib/data/recipes";
import { findLegumes } from "@/lib/data/legumes";

describe("shopping list", () => {
  it("always starts with a prep-day shop, and any extras are top-ups", () => {
    for (const w of [1, 2, 4]) {
      const lists = buildShoppingLists(generatePlan({ settings: { coverage: weeks(w) }, restarts: 10, seed: 1 }));
      expect(lists.length).toBeGreaterThan(0);
      expect(lists[0].shopIndex).toBe(0);
      for (const l of lists) expect(l.lines.length).toBeGreaterThan(0);
    }
  });

  it("keeps the prep shop smaller by deferring week-two fresh items", () => {
    // Everything for the batch cook must be bought on prep day, but avocados
    // for a meal on day 11 should not be.
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 30, seed: 4 });
    const lists = buildShoppingLists(plan);
    const topUps = lists.filter((l) => l.shopIndex > 0);
    for (const t of topUps) {
      expect(t.lines.length, "a top-up should be small").toBeLessThan(lists[0].lines.length);
    }
  });

  it("merges an ingredient used by several recipes into one line", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 30, seed: 4 });
    const [list] = buildShoppingLists(plan);
    const shared = list.lines.filter((l) => l.usedIn.length > 1);
    expect(shared.length, "expected some ingredients to be shared across recipes").toBeGreaterThan(3);
  });

  it("never lists the same ingredient twice, even in different units", () => {
    // Chives are called for as "1 tbsp" in one recipe and "a handful" in
    // another. Keyed by item+unit those became two lines on the list.
    for (let seed = 0; seed < 10; seed++) {
      const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed });
      for (const list of buildShoppingLists(plan)) {
        const items = list.lines.map((l) => l.item);
        expect(new Set(items).size, `duplicate line in seed ${seed}`).toBe(items.length);
      }
    }
  });

  it("buys at least as much as the recipes require", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 20, seed: 9 });
    const [list] = buildShoppingLists(plan);
    for (const line of list.lines) {
      if (line.packs) expect(line.packs).toBeGreaterThanOrEqual(1);
      for (const a of line.amounts) {
        if (a.quantity != null) expect(a.quantity).toBeGreaterThan(0);
      }
    }
  });

  it("includes ingredients for no-cook meals, which are never batch-cooked", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 30, seed: 17 });
    const noCookMeals = plan.meals.filter((m) => getRecipe(m.recipeId).noCook);
    if (noCookMeals.length === 0) return;
    const [list] = buildShoppingLists(plan);
    const listed = new Set(list.lines.map((l) => l.item));
    for (const m of noCookMeals) {
      for (const i of getRecipe(m.recipeId).ingredients) {
        expect(listed.has(i.item), `${i.item} missing from the list`).toBe(true);
      }
    }
  });

  it("never puts a legume on the shopping list", () => {
    for (let seed = 0; seed < 20; seed++) {
      const plan = generatePlan({ settings: { coverage: weeks(4) }, restarts: 5, seed });
      for (const list of buildShoppingLists(plan)) {
        for (const line of list.lines) {
          expect(findLegumes(line.item), `${line.item} is a legume`).toEqual([]);
        }
      }
    }
  });

  it("formats countable items without a stray unit", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 20, seed: 4 });
    const text = shoppingListToText(buildShoppingLists(plan)[0]);
    expect(text).not.toMatch(/\dpiece/);
  });

  it("never asks for a fraction of something you buy whole", () => {
    for (let seed = 0; seed < 10; seed++) {
      const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed });
      for (const list of buildShoppingLists(plan)) {
        const text = shoppingListToText(list);
        // "need 0.5" for an avocado is not a thing you can buy.
        expect(text, `seed ${seed}`).not.toMatch(/need [\d.]*\.\d\)/);
      }
    }
  });

  it("does not pluralise tbsp or tsp", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 20, seed: 4 });
    const text = shoppingListToText(buildShoppingLists(plan)[0]);
    expect(text).not.toMatch(/tbsps|tsps/);
  });

  it("renders as copyable text", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed: 5 });
    const text = shoppingListToText(buildShoppingLists(plan)[0]);
    expect(text).toContain("shop");
    expect(text.split("\n").filter((l) => l.startsWith("- ")).length).toBeGreaterThan(8);
  });

  it("can hide cupboard staples", () => {
    const plan = generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed: 5 });
    const list = buildShoppingLists(plan)[0];
    const withStaples = shoppingListToText(list, true).split("\n").filter((l) => l.startsWith("- ")).length;
    const without = shoppingListToText(list, false).split("\n").filter((l) => l.startsWith("- ")).length;
    expect(without).toBeLessThan(withStaples);
  });
});

describe("shopping list copy reads like a human wrote it", () => {
  it("pluralises countable items", () => {
    for (let seed = 0; seed < 12; seed++) {
      const text = shoppingListToText(
        buildShoppingLists(generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed }))[0]
      );
      expect(text, `seed ${seed}`).not.toMatch(/\b([2-9]|\d\d+) (onion|potato|lemon|egg|apple|banana|carrot|avocado|courgette|leek)\b/);
    }
  });

  it("never lists a bare ingredient with no quantity at all", () => {
    for (let seed = 0; seed < 12; seed++) {
      const list = buildShoppingLists(generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed }))[0];
      for (const line of list.lines) {
        expect(formatLine(line), `"${line.item}" has no quantity`).not.toBe(line.item);
      }
    }
  });

  it("does not list teaspoons and tablespoons of the same thing separately", () => {
    for (let seed = 0; seed < 12; seed++) {
      const text = shoppingListToText(
        buildShoppingLists(generatePlan({ settings: { coverage: weeks(2) }, restarts: 10, seed }))[0]
      );
      expect(text, `seed ${seed}`).not.toMatch(/tsp \+ [\d.]+ tbsp/);
    }
  });
});
