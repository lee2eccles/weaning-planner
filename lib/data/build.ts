import type { Recipe } from "@/lib/types";
import { allergensFor } from "./ingredients";
import { findLegumes } from "./legumes";

type RecipeInput = Omit<Recipe, "allergens" | "cubesYielded"> & {
  allergens?: Recipe["allergens"];
  cubesYielded?: number;
};

/**
 * Builds a Recipe, deriving allergens from the ingredient catalogue and cube
 * yield from the normalised portion count, then verifying the declared
 * legumeStatus against an independent scan of the recipe's own text.
 *
 * The verification is the point: `legumeStatus` is hand-declared, and a
 * hand-declared safety flag that nothing checks is exactly the kind of thing
 * that silently goes wrong. See PRD §4.1 R3.
 */
export function recipe(r: RecipeInput): Recipe {
  const allergens = r.allergens ?? allergensFor(r.ingredients);

  const cubesYielded =
    r.cubesYielded ??
    (r.freezeFormat === "cube" ? Math.round(r.babyPortions * 2) : undefined);

  // Independent scan of everything a cook would read.
  const scanned = [
    r.title,
    ...r.ingredients.map((i) => `${i.item} ${i.note ?? ""}`),
    ...r.method,
    ...r.tips,
  ].join(" \n ");

  const found = findLegumes(scanned);

  if (r.legumeStatus === "contains" && found.length === 0) {
    throw new Error(
      `Recipe "${r.title}" is declared as containing legumes, but none were found. ` +
        `Either the declaration is wrong or the exclusion list has a gap.`
    );
  }

  if (r.legumeStatus !== "contains" && found.length > 0) {
    throw new Error(
      `Recipe "${r.title}" is declared "${r.legumeStatus}" but legume terms were ` +
        `found in its text: ${found.join(", ")}. A recipe that reaches a plan must ` +
        `be free of legumes in ingredients, method AND tips (PRD §4.1 R2).`
    );
  }

  return { ...r, allergens, cubesYielded };
}
