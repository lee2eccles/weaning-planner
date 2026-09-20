import { describe, it, expect } from "vitest";
import { searchRecipes, matchesQuery } from "@/lib/data/search";
import { ALL_RECIPES, getRecipe, QUICK_MAX_MINUTES } from "@/lib/data/recipes";
import { recipeToText, savedListToText } from "@/lib/text/export";

const find = (q: string) => searchRecipes(ALL_RECIPES, q).map((r) => r.id);

describe("recipe search", () => {
  it("returns the whole library for an empty query", () => {
    expect(searchRecipes(ALL_RECIPES, "")).toHaveLength(ALL_RECIPES.length);
    expect(searchRecipes(ALL_RECIPES, "   ")).toHaveLength(ALL_RECIPES.length);
  });

  it("finds a recipe by a word in its title", () => {
    expect(find("mackerel")).toContain("quick-mackerel-potato-sweetcorn-smash");
  });

  it("finds recipes by an ingredient that is not in the title", () => {
    const withRicotta = find("ricotta");
    expect(withRicotta.length).toBeGreaterThan(0);
    for (const id of withRicotta) {
      const r = getRecipe(id);
      const text = `${r.title} ${r.ingredients.map((i) => i.item).join(" ")}`.toLowerCase();
      expect(text).toContain("ricotta");
    }
  });

  it("matches on a partial word, because that is how half-remembering works", () => {
    expect(find("mack")).toContain("quick-mackerel-potato-sweetcorn-smash");
    expect(find("courg")).toContain("quick-chicken-courgette-couscous");
  });

  it("searches plain-language tags that appear nowhere in the recipe", () => {
    const quick = find("quick");
    expect(quick.length).toBeGreaterThan(0);
    for (const id of quick) expect(getRecipe(id).activeMinutes).toBeLessThanOrEqual(QUICK_MAX_MINUTES);

    const iron = find("iron");
    expect(iron.length).toBeGreaterThan(0);
    for (const id of iron) expect(getRecipe(id).ironRich).toBe(true);
  });

  it("narrows rather than widens as words are added", () => {
    const one = find("chicken");
    const two = find("chicken couscous");
    expect(two.length).toBeGreaterThan(0);
    expect(two.length).toBeLessThanOrEqual(one.length);
    for (const id of two) expect(one).toContain(id);
  });

  it("ranks a title match above a mention in the method", () => {
    const results = find("egg");
    const titleFirst = getRecipe(results[0]).title.toLowerCase();
    expect(titleFirst).toContain("egg");
  });

  it("ignores case, accents and punctuation", () => {
    expect(find("CRÈME")).toEqual(find("creme"));
    expect(find("lemon.")).toEqual(find("lemon"));
  });

  it("returns nothing for a word in no recipe", () => {
    expect(find("kangaroo")).toEqual([]);
    expect(matchesQuery(ALL_RECIPES[0], "kangaroo")).toBe(false);
  });
});

describe("copying to a notes app", () => {
  const recipe = getRecipe("quick-sardine-tomato-toast");

  it("writes a recipe you could cook from with the app closed", () => {
    const text = recipeToText(recipe);
    expect(text).toContain(recipe.title);
    expect(text).toContain("INGREDIENTS");
    expect(text).toContain("METHOD");
    for (const i of recipe.ingredients) expect(text).toContain(i.item);
    expect(text).toContain("1. ");
    expect(text.toLowerCase()).toContain("legume-free");
  });

  it("includes the parent's own note when there is one", () => {
    expect(recipeToText(recipe, "would not touch it")).toContain("would not touch it");
    expect(recipeToText(recipe, "   ")).not.toContain("MY NOTE");
    expect(recipeToText(recipe)).not.toContain("MY NOTE");
  });

  it("writes the saved list with its notes attached", () => {
    const list = savedListToText([recipe], { [recipe.id]: "double it next time" });
    expect(list).toContain(recipe.title);
    expect(list).toContain("double it next time");
    expect(savedListToText([])).toContain("No saved recipes");
  });
});
