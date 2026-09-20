import { describe, it, expect } from "vitest";
import { ALL_RECIPES, PLANNABLE_RECIPES, plannableFor, QUICK_MAX_MINUTES } from "@/lib/data/recipes";
import { QUICK_RECIPES } from "@/lib/data/recipes.quick";
import { findLegumes } from "@/lib/data/legumes";
import { INGREDIENTS } from "@/lib/data/ingredients";

describe("recipe library integrity", () => {
  it("every recipe has a unique id", () => {
    const ids = ALL_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every ingredient is in the canonical catalogue", () => {
    for (const r of ALL_RECIPES) {
      for (const i of r.ingredients) {
        expect(INGREDIENTS[i.item], `${r.title} uses unknown ingredient "${i.item}"`).toBeDefined();
      }
    }
  });

  it("no plannable recipe mentions a legume anywhere a cook would read", () => {
    for (const r of PLANNABLE_RECIPES) {
      const text = [
        r.title,
        ...r.ingredients.map((i) => `${i.item} ${i.note ?? ""}`),
        ...r.method,
        ...r.tips,
      ].join(" \n ");
      expect(findLegumes(text), `${r.title} contains legume terms`).toEqual([]);
    }
  });

  it("keeps the structural guarantee that a legume recipe can never be planned", () => {
    // Nothing in the library contains legumes, but the filter must still hold
    // if one were ever added by mistake.
    for (const r of ALL_RECIPES) {
      if (r.legumeStatus === "contains") {
        expect(PLANNABLE_RECIPES.find((p) => p.id === r.id)).toBeUndefined();
      }
    }
    expect(PLANNABLE_RECIPES.length).toBe(ALL_RECIPES.length);
  });

  it("carries no reference to any third-party cookbook", () => {
    // The library was rewritten so the repository can be published. Nothing
    // here should point back at someone else's book. The Recipe type no longer
    // has `page` or `basedOn` at all, so this checks the data itself.
    for (const r of ALL_RECIPES) {
      const keys = Object.keys(r);
      expect(keys, `${r.title} has a page reference`).not.toContain("page");
      expect(keys, `${r.title} cites a source recipe`).not.toContain("basedOn");
      expect(keys, `${r.title} lists substitutions`).not.toContain("substitutions");
      expect(["core", "extra"]).toContain(r.source);
    }
  });

  it("does not reproduce anyone else's prose", () => {
    // A cheap structural guard: no recipe text should cite a page or a book.
    for (const r of ALL_RECIPES) {
      const text = [r.title, r.blurb ?? "", ...r.method, ...r.tips].join(" ");
      expect(text, `${r.title} mentions a page`).not.toMatch(/\bp(age)?\.?\s?\d{2,3}\b/i);
      expect(text, `${r.title} mentions a book`).not.toMatch(/\bbook\b/i);
    }
  });

  it("covers iron, which matters more here because pulses are excluded", () => {
    const iron = PLANNABLE_RECIPES.filter((r) => r.ironRich);
    // Enough that a week of lunches can reasonably include several.
    expect(iron.length).toBeGreaterThanOrEqual(8);
    expect(iron.some((r) => r.slots.includes("lunch"))).toBe(true);
    expect(iron.some((r) => r.slots.includes("breakfast"))).toBe(true);
  });

  it("cube-format recipes declare a cube yield, others do not", () => {
    for (const r of ALL_RECIPES) {
      if (r.freezeFormat === "cube") expect(r.cubesYielded, r.title).toBeGreaterThan(0);
      else expect(r.cubesYielded, r.title).toBeUndefined();
    }
  });

  it("has enough variety to plan four weeks without heavy repetition", () => {
    const breakfasts = plannableFor("breakfast", 9);
    const lunches = plannableFor("lunch", 9);
    // 28 days, max twice per week => need at least 4 distinct per slot per week.
    expect(breakfasts.length).toBeGreaterThanOrEqual(10);
    expect(lunches.length).toBeGreaterThanOrEqual(14);
  });

  it("keeps every quick recipe inside its fifteen minutes", () => {
    expect(QUICK_RECIPES.length).toBeGreaterThanOrEqual(10);
    for (const r of QUICK_RECIPES) {
      expect(r.activeMinutes, `${r.title} takes ${r.activeMinutes} min`).toBeLessThanOrEqual(
        QUICK_MAX_MINUTES
      );
      expect(r.longRecipe, r.title).toBe(false);
      expect(r.legumeStatus, r.title).toBe("safe");
    }
  });

  it("gives a plan enough recipes that fit between naps", () => {
    const quick = PLANNABLE_RECIPES.filter((r) => r.activeMinutes <= QUICK_MAX_MINUTES);
    expect(quick.filter((r) => r.slots.includes("lunch")).length).toBeGreaterThanOrEqual(8);
    expect(quick.filter((r) => r.slots.includes("breakfast")).length).toBeGreaterThanOrEqual(8);
    // Iron is the hard nutrient in a legume-free plan; it must not be the slow half.
    expect(quick.filter((r) => r.ironRich).length).toBeGreaterThanOrEqual(6);
  });

  it("states a plausible hands-on time for every recipe", () => {
    for (const r of ALL_RECIPES) {
      expect(r.activeMinutes, r.title).toBeGreaterThan(0);
      expect(r.activeMinutes, r.title).toBeLessThanOrEqual(90);
      if (r.noCook) expect(r.activeMinutes, `${r.title} is no-cook`).toBeLessThanOrEqual(10);
    }
  });

  it("derives allergens from ingredients", () => {
    const eggy = ALL_RECIPES.find((r) => r.id === "soft-turmeric-eggs")!;
    expect(eggy.allergens).toContain("eggs");
    expect(eggy.allergens).toContain("gluten");
    const dairyFree = ALL_RECIPES.find((r) => r.id === "white-fish-rice-pot")!;
    expect(dairyFree.allergens).toContain("fish");
    expect(dairyFree.allergens).not.toContain("milk");
  });
});
