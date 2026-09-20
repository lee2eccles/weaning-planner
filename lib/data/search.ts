import type { Recipe } from "@/lib/types";
import { ALLERGEN_LABELS } from "@/lib/types";

/**
 * Recipe search.
 *
 * Deliberately generous about what counts as a match: with a saved list to get
 * back to, the common search is half-remembered — "that mackerel thing", "the
 * one with the sweetcorn" — so ingredients, tips and plain-language tags are
 * all searchable, not just titles. Plain substring matching on each word, so
 * "mack" finds mackerel.
 */

function normalise(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Words a parent might reasonably search that are not written in the recipe. */
function tagsFor(r: Recipe): string[] {
  const tags: string[] = [...r.slots];
  if (r.ironRich) tags.push("iron");
  if (r.vegetarian) tags.push("vegetarian", "veggie", "meat free");
  if (r.glutenFree) tags.push("gluten free");
  if (r.noCook) tags.push("no cook", "assembly");
  if (r.freezable !== "no") tags.push("freezer", "freezes", "batch");
  if (r.activeMinutes <= 15) tags.push("quick", "fast", "15 minutes");
  if (r.feedsAdultToo) tags.push("family", "adults");
  for (const a of r.allergens) tags.push(ALLERGEN_LABELS[a]);
  return tags;
}

/** Everything about a recipe that a search term may land on. */
export function searchableText(r: Recipe): string {
  return normalise(
    [
      r.title,
      r.blurb ?? "",
      ...r.ingredients.map((i) => `${i.item} ${i.note ?? ""}`),
      ...r.method,
      ...r.tips,
      ...tagsFor(r),
    ].join(" ")
  );
}

/** Title and ingredient names only — a match here is worth ranking above the rest. */
function headlineText(r: Recipe): string {
  return normalise([r.title, ...r.ingredients.map((i) => i.item)].join(" "));
}

/** Every word must match somewhere, so extra words narrow rather than widen. */
export function matchesQuery(r: Recipe, query: string): boolean {
  const words = normalise(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = searchableText(r);
  return words.every((w) => haystack.includes(w));
}

/**
 * Filters and ranks in one pass. Title matches come first, then ingredients,
 * then anything else; ties keep the library's own order.
 */
export function searchRecipes(recipes: Recipe[], query: string): Recipe[] {
  const words = normalise(query).split(" ").filter(Boolean);
  if (words.length === 0) return recipes;

  const scored = recipes.map((r, index) => {
    const haystack = searchableText(r);
    const title = normalise(r.title);
    const headline = headlineText(r);
    const hits = words.filter((w) => haystack.includes(w)).length;
    const rank = words.every((w) => title.includes(w))
      ? 0
      : words.every((w) => headline.includes(w))
        ? 1
        : 2;
    return { r, rank, index, hits };
  });

  const all = scored.filter((x) => x.hits === words.length);

  /**
   * "that mackerel thing we liked" used to return nothing, because every word
   * had to match. People search in whole sentences, so when nothing matches
   * them all, fall back to whatever matched the most words — never an empty
   * screen while a good answer exists.
   */
  const best = all.length > 0 ? all : bestPartial(scored);

  return best
    .sort((a, b) => b.hits - a.hits || a.rank - b.rank || a.index - b.index)
    .map((x) => x.r);
}

type Scored = { r: Recipe; rank: number; index: number; hits: number };

function bestPartial(scored: Scored[]): Scored[] {
  const most = Math.max(0, ...scored.map((x) => x.hits));
  if (most === 0) return [];
  return scored.filter((x) => x.hits === most);
}
