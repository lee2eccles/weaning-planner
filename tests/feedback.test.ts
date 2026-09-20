import { describe, it, expect } from "vitest";
import { generatePlan } from "@/lib/planner/generate";
import { buildShoppingLists, shoppingListToText, planToText } from "@/lib/shopping/merge";
import { getRecipe, ALL_RECIPES } from "@/lib/data/recipes";
import { cubesPerPortion, scaleIngredients, scaleQuantity, batchLabel, DEFAULT_FREEZER } from "@/lib/planner/portions";
import { dayToText, prepSessionToText, recipeToText } from "@/lib/text/export";
import { ALLERGEN_LABELS } from "@/lib/types";
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

/**
 * Second round of parent testing: small plans, the handover to the other
 * parent, and whether week seven is quicker than week one.
 */
describe("what the second round of testers found", () => {
  it("sizes a four-lunch plan like four lunches, not like a fortnight", () => {
    let recipes = 0;
    let items = 0;
    for (let seed = 0; seed < 10; seed++) {
      const plan = generatePlan({ settings: { meals: 4 }, restarts: 20, seed });
      recipes += new Set(plan.meals.map((m) => m.recipeId)).size;
      items += buildShoppingLists(plan)[0].lines.length;
    }
    // Was 3 recipes and 16 shopping items for 8 portions, because variety was
    // judged on a fixed 7-day scale whatever the plan's length.
    expect(recipes / 10).toBeLessThanOrEqual(2.6);
    expect(items / 10).toBeLessThanOrEqual(13);
  });

  it("pulls a saved recipe into the plan rather than pushing it out", () => {
    const favourite = "quick-mackerel-potato-sweetcorn-smash";
    let appears = 0;
    for (let seed = 0; seed < 10; seed++) {
      const plan = generatePlan({
        settings: { meals: 14 }, restarts: 20, seed, preferred: [favourite],
      });
      if (plan.meals.some((m) => m.recipeId === favourite)) appears++;
    }
    // Saving it used to take it from 6 plans in 10 to none at all.
    expect(appears).toBe(10);
  });

  it("never plans a recipe that has been ruled out", () => {
    const banned = "app-mushroom-spinach-parmesan-risotto";
    for (let seed = 0; seed < 10; seed++) {
      const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed, blocked: [banned] });
      expect(plan.meals.some((m) => m.recipeId === banned), `seed ${seed}`).toBe(false);
    }
  });

  it("drops a locked meal that falls outside a shorter plan", () => {
    // It used to be re-applied at its old day index: invisible in the grid,
    // but still shopped for and still cooked, at about 50% extra food.
    const fortnight = generatePlan({ settings: { meals: 14 }, restarts: 5, seed: 1 });
    const locked = [{ ...fortnight.meals[11], locked: true }];
    const short = generatePlan({ settings: { meals: 4 }, restarts: 5, seed: 1, locked });

    expect(short.meals).toHaveLength(4);
    expect(Math.max(...short.meals.map((m) => m.dayIndex))).toBe(3);
    for (const session of short.prepSessions) {
      expect(Math.max(...session.coversDayIndices)).toBeLessThan(4);
    }
  });

  it("gives every defrost instruction a number in the shared plan", () => {
    const plan = generatePlan({
      settings: { meals: 28, slots: ["breakfast", "lunch"] }, restarts: 20, seed: 3,
    });
    const text = planToText(plan);
    // "defrost  cubes the night before" — the blank was the one instruction
    // the receiving parent most needed.
    expect(text).not.toMatch(/take\s{2,}/);
    expect(text).not.toMatch(/\s{2,}(cubes|portions)/);
    for (const line of text.split("\n").filter((l) => l.includes("out the night before"))) {
      expect(line, line).toMatch(/take \d+ (cubes|portions?) out the night before/);
    }
  });

  it("says where the plan has got to when it is shared", () => {
    const plan = generatePlan({ settings: { meals: 7 }, restarts: 5, seed: 2 });
    const done = new Set(plan.meals.filter((m) => m.dayIndex < 2).map((m) => `${m.dayIndex}:${m.slot}`));
    const text = planToText(plan, { done, currentDay: 2 });

    expect(text).toContain("← you are here");
    expect(text).toContain("prep day");
    expect(text.split("\n").filter((l) => l.endsWith("✓")).length).toBe(2);
  });

  it("carries allergens into the shared plan and the day handover", () => {
    const plan = generatePlan({ settings: { meals: 7 }, restarts: 5, seed: 2 });
    const withAllergens = plan.meals.find((m) => getRecipe(m.recipeId).allergens.length > 0)!;
    const label = ALLERGEN_LABELS[getRecipe(withAllergens.recipeId).allergens[0]].toLowerCase();

    expect(planToText(plan)).toContain(label);
    expect(dayToText(plan, withAllergens.dayIndex, getRecipe)).toContain(label);
  });

  it("writes a handover a second parent can act on alone", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 6 });
    const text = dayToText(plan, 2, getRecipe, {});

    expect(text).toContain("Day 3 of 14");
    expect(text.length).toBeLessThan(700); // readable in a notification
    const defrostTomorrow = plan.meals.some((m) => m.dayIndex === 3 && m.state === "defrost");
    if (defrostTomorrow) expect(text).toContain("Take out of the freezer tonight");
  });

  it("says so when the shopping is finished instead of sending blank lines", () => {
    const plan = generatePlan({ settings: { meals: 7 }, restarts: 5, seed: 4 });
    const list = buildShoppingLists(plan)[0];
    const all = new Set(list.lines.map((l) => `${list.shopIndex}:${l.item}`));
    expect(shoppingListToText(list, true, all)).toContain("All done");
  });

  it("names the cupboard staples it leaves off the shared list", () => {
    const plan = generatePlan({ settings: { meals: 14 }, restarts: 10, seed: 5 });
    const list = buildShoppingLists(plan)[0];
    const staple = list.lines.find((l) => l.isPantryStaple);
    if (!staple) return;
    const text = shoppingListToText(list, false);
    expect(text).toContain("check before you go");
    expect(text).toContain(staple.item);
  });

  it("finds a recipe through a single typo", () => {
    for (const typo of ["mackrel", "makerel", "mackeral"]) {
      const results = searchRecipes(ALL_RECIPES, typo);
      expect(results[0]?.title, typo).toContain("Mackerel");
    }
    expect(searchRecipes(ALL_RECIPES, "kangaroo")).toEqual([]);
  });
});
