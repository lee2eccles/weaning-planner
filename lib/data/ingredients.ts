import type { Aisle, Allergen, Unit, Ingredient } from "@/lib/types";

/**
 * Canonical ingredient catalogue.
 *
 * Recipes reference ingredients by canonical name so that overlap detection and
 * shopping-list merging are reliable — "cherry tomatoes" and "tomatoes, cherry"
 * must not become two lines on the list.
 *
 * `perishability` (0–1) weights the planner's ingredient-overlap score: sharing a
 * bag of spinach across two recipes in the same week is worth far more than
 * sharing olive oil, because the spinach is what actually goes in the bin.
 */

export interface IngredientMeta {
  aisle: Aisle;
  perishability: number;
  /** Typical supermarket pack size, in the unit the recipes use. */
  packSize?: number;
  packUnit?: Unit;
  /** Human wording for the shopping list, e.g. "bag of spinach". */
  packLabel?: string;
  allergens?: Allergen[];
  note?: string;
  /** Plural form, for countable items on the shopping list. */
  plural?: string;
  /**
   * Grams in a level tablespoon, for ingredients bought by weight but cooked
   * by the spoonful. "9 tbsp unsalted butter" is not a thing you can buy.
   */
  gramsPerTbsp?: number;
  /**
   * How the name is written on screen. Catalogue keys stay plain ASCII so that
   * matching and merging are reliable; this is what a person should read.
   */
  display?: string;
  /**
   * What has to be done to this ingredient before a baby can have it safely.
   *
   * Held on the ingredient rather than written into each recipe, because a
   * recipe is where it gets forgotten: six of the nine sweetcorn recipes said
   * nothing about the kernels. Stated once here, it shows on every recipe and
   * on the prep sheet, and a new recipe cannot be written without it.
   */
  chokingNote?: string;
}

const P = "produce" as const;
const D = "dairy" as const;
const M = "meatFish" as const;
const B = "bakery" as const;
const G = "dryGoods" as const;
const T = "tinned" as const;
const F = "frozen" as const;
const H = "herbsSpices" as const;
const O = "other" as const;

export const INGREDIENTS: Record<string, IngredientMeta> = {
  /* ---------- Produce ---------- */
  "pear": { aisle: P, plural: "pears", perishability: 0.8, packSize: 4, packUnit: "piece", packLabel: "pack of pears" },
  "apple": { aisle: P, plural: "apples", perishability: 0.6, packSize: 6, packUnit: "piece", packLabel: "pack of apples" },
  "banana": { aisle: P, plural: "bananas", perishability: 0.85, packSize: 5, packUnit: "piece", packLabel: "bunch of bananas" },
  "mango": { aisle: P, plural: "mangoes", perishability: 0.85, packSize: 1, packUnit: "piece" },
  "strawberries": { aisle: P, perishability: 0.9, packSize: 300, packUnit: "g", packLabel: "punnet of strawberries", chokingNote: "quarter lengthways, or mash — a whole berry is the size of an airway" },
  "blackberries": { aisle: P, perishability: 0.9, packSize: 150, packUnit: "g", packLabel: "punnet of blackberries" },
  "blueberries": { aisle: P, perishability: 0.9, packSize: 150, packUnit: "g", packLabel: "punnet of blueberries", chokingNote: "squash each one between your fingers, or halve them — round and firm is the shape that blocks" },
  "raspberries": { aisle: P, perishability: 0.9, packSize: 150, packUnit: "g", packLabel: "punnet of raspberries" },
  "cooked beetroot": { aisle: P, plural: "cooked beetroot", perishability: 0.4, packSize: 2, packUnit: "piece", packLabel: "pack of cooked beetroot", note: "vacuum-packed in water" },
  "butternut squash": { aisle: P, perishability: 0.3, packSize: 1000, packUnit: "g", packLabel: "butternut squash" },
  "sweet potato": { aisle: P, plural: "sweet potatoes", perishability: 0.35, packSize: 750, packUnit: "g", packLabel: "pack of sweet potatoes" },
  "potato": { aisle: P, plural: "potatoes", perishability: 0.3, packSize: 1000, packUnit: "g", packLabel: "bag of potatoes" },
  "spinach": { aisle: P, perishability: 0.95, packSize: 240, packUnit: "g", packLabel: "bag of spinach" },
  "kale": { aisle: P, perishability: 0.9, packSize: 200, packUnit: "g", packLabel: "bag of kale" },
  "cauliflower": { aisle: P, perishability: 0.65, packSize: 600, packUnit: "g", packLabel: "cauliflower" },
  "broccoli": { aisle: P, perishability: 0.7, packSize: 350, packUnit: "g", packLabel: "head of broccoli" },
  "tenderstem broccoli": { aisle: P, perishability: 0.8, packSize: 200, packUnit: "g", packLabel: "pack of tenderstem" },
  "courgette": { aisle: P, plural: "courgettes", perishability: 0.7, packSize: 2, packUnit: "piece", packLabel: "pack of courgettes" },
  "carrot": { aisle: P, plural: "carrots", perishability: 0.4, packSize: 500, packUnit: "g", packLabel: "bag of carrots", chokingNote: "cook until it crushes easily against the roof of your mouth — never raw, and never in coins" },
  "red pepper": { aisle: P, plural: "red peppers", perishability: 0.7, packSize: 3, packUnit: "piece", packLabel: "pack of peppers" },
  "cherry tomatoes": { aisle: P, perishability: 0.75, packSize: 300, packUnit: "g", packLabel: "punnet of cherry tomatoes", chokingNote: "quarter lengthways. Halved is not enough — a half still seals an airway" },
  "cucumber": { aisle: P, plural: "cucumbers", perishability: 0.75, packSize: 1, packUnit: "piece" },
  "avocado": { aisle: P, plural: "avocados", perishability: 0.9, packSize: 2, packUnit: "piece", packLabel: "pack of avocados" },
  "chestnut mushrooms": { aisle: P, perishability: 0.8, packSize: 250, packUnit: "g", packLabel: "pack of chestnut mushrooms" },
  "onion": { aisle: P, plural: "onions", perishability: 0.2, packSize: 1000, packUnit: "g", packLabel: "bag of onions" },
  "red onion": { aisle: P, plural: "red onions", perishability: 0.2, packSize: 3, packUnit: "piece", packLabel: "pack of red onions" },
  "shallots": { aisle: P, perishability: 0.3, packSize: 250, packUnit: "g", packLabel: "pack of shallots" },
  "spring onion": { aisle: P, plural: "spring onions", perishability: 0.8, packSize: 6, packUnit: "piece", packLabel: "bunch of spring onions" },
  "leek": { aisle: P, plural: "leeks", perishability: 0.6, packSize: 3, packUnit: "piece", packLabel: "pack of leeks" },
  "garlic": { aisle: P, plural: "garlic cloves", perishability: 0.15, packSize: 12, packUnit: "clove", packLabel: "bulb of garlic" },
  "ginger": { aisle: P, perishability: 0.4, packSize: 1, packUnit: "piece", packLabel: "piece of ginger" },
  "lemon": { aisle: P, plural: "lemons", perishability: 0.5, packSize: 4, packUnit: "piece", packLabel: "pack of lemons" },
  "lime": { aisle: P, plural: "limes", perishability: 0.5, packSize: 4, packUnit: "piece", packLabel: "pack of limes" },
  "sweetcorn": { aisle: T, perishability: 0.1, packSize: 325, packUnit: "g", packLabel: "tin of sweetcorn", chokingNote: "crush, chop or blitz the kernels — a whole kernel is firm, round and exactly the wrong size, and the skin makes it slippery" },

  /* ---------- Fresh herbs ---------- */
  "basil": { aisle: P, perishability: 0.95, packSize: 1, packUnit: "piece", packLabel: "pot of basil" },
  "parsley": { aisle: P, perishability: 0.95, packSize: 1, packUnit: "piece", packLabel: "pot of parsley" },
  "chives": { aisle: P, perishability: 0.95, packSize: 1, packUnit: "piece", packLabel: "pack of chives" },
  "dill": { aisle: P, perishability: 0.95, packSize: 1, packUnit: "piece", packLabel: "pack of dill" },
  "tarragon": { aisle: P, perishability: 0.95, packSize: 1, packUnit: "piece", packLabel: "pack of tarragon" },
  "rosemary": { aisle: P, perishability: 0.6, packSize: 1, packUnit: "piece", packLabel: "pack of rosemary" },

  /* ---------- Dairy & eggs ---------- */
  "whole milk": { aisle: D, perishability: 0.75, packSize: 2000, packUnit: "ml", packLabel: "2-litre bottle of whole milk", allergens: ["milk"] },
  "greek yoghurt": { aisle: D, perishability: 0.6, packSize: 500, packUnit: "g", packLabel: "tub of Greek yoghurt", allergens: ["milk"], gramsPerTbsp: 18 },
  "natural yoghurt": { aisle: D, perishability: 0.6, packSize: 500, packUnit: "g", packLabel: "tub of natural yoghurt", allergens: ["milk"], gramsPerTbsp: 18 },
  "cheddar": { aisle: D, perishability: 0.35, packSize: 400, packUnit: "g", packLabel: "block of cheddar", allergens: ["milk"] },
  "parmesan": { aisle: D, perishability: 0.3, packSize: 200, packUnit: "g", packLabel: "piece of parmesan", allergens: ["milk"], note: "or vegetarian hard cheese" },
  "ricotta": { aisle: D, perishability: 0.7, packSize: 250, packUnit: "g", packLabel: "tub of ricotta", allergens: ["milk"], gramsPerTbsp: 15 },
  "cream cheese": { aisle: D, perishability: 0.55, packSize: 280, packUnit: "g", packLabel: "tub of cream cheese", allergens: ["milk"], gramsPerTbsp: 15 },
  "creme fraiche": { aisle: D, display: "crème fraîche", perishability: 0.7, packSize: 200, packUnit: "g", packLabel: "pot of crème fraîche", allergens: ["milk"], gramsPerTbsp: 15 },
  "unsalted butter": { aisle: D, perishability: 0.3, packSize: 250, packUnit: "g", packLabel: "pack of unsalted butter", allergens: ["milk"], gramsPerTbsp: 14 },
  "egg": { aisle: D, plural: "eggs", perishability: 0.45, packSize: 6, packUnit: "piece", packLabel: "box of eggs", allergens: ["eggs"] },

  /* ---------- Meat & fish ---------- */
  "cod": { aisle: M, perishability: 0.95, packSize: 240, packUnit: "g", packLabel: "pack of cod fillets", allergens: ["fish"] },
  "haddock": { aisle: M, perishability: 0.95, packSize: 240, packUnit: "g", packLabel: "pack of haddock fillets", allergens: ["fish"], note: "unsmoked only — smoked is far too salty for a baby" },
  "white fish": { aisle: M, perishability: 0.95, packSize: 240, packUnit: "g", packLabel: "pack of white fish fillets", allergens: ["fish"], note: "haddock, cod or hake" },
  "salmon": { aisle: M, perishability: 0.95, packSize: 240, packUnit: "g", packLabel: "pack of salmon fillets", allergens: ["fish"] },
  "chicken thighs": { aisle: M, plural: "chicken thighs", perishability: 0.9, packSize: 6, packUnit: "piece", packLabel: "pack of chicken thighs", note: "skinless, boneless" },
  "lamb mince": { aisle: M, perishability: 0.9, packSize: 500, packUnit: "g", packLabel: "pack of lamb mince" },
  "beef mince": { aisle: M, perishability: 0.9, packSize: 500, packUnit: "g", packLabel: "pack of beef mince" },
  "chicken breast": { aisle: M, perishability: 0.9, packSize: 600, packUnit: "g", packLabel: "pack of chicken breasts", note: "skinless" },

  /* ---------- Bakery ---------- */
  "brown bread": { aisle: B, plural: "slices of brown bread", perishability: 0.6, packSize: 16, packUnit: "slice", packLabel: "loaf of brown bread", allergens: ["gluten"], note: "check the label — bread, wraps and crumbs commonly contain soya lecithin or soya flour" },
  "flatbread": { aisle: B, plural: "flatbreads", perishability: 0.5, packSize: 4, packUnit: "piece", packLabel: "pack of flatbreads", allergens: ["gluten"], note: "check the label — bread, wraps and crumbs commonly contain soya lecithin or soya flour" },
  "breadcrumbs": { aisle: G, perishability: 0.1, packSize: 150, packUnit: "g", packLabel: "pack of breadcrumbs", allergens: ["gluten"], gramsPerTbsp: 6, note: "check the label — bread, wraps and crumbs commonly contain soya lecithin or soya flour" },

  /* ---------- Dry goods ---------- */
  "porridge oats": { aisle: G, perishability: 0.05, packSize: 1000, packUnit: "g", packLabel: "bag of porridge oats", allergens: ["gluten"], note: "use certified gluten-free oats if avoiding gluten", gramsPerTbsp: 9 },
  "quinoa": { aisle: G, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "bag of quinoa" },
  "jasmine rice": { aisle: G, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "bag of jasmine rice" },
  "white rice": { aisle: G, perishability: 0.05, packSize: 1000, packUnit: "g", packLabel: "bag of rice" },
  "risotto rice": { aisle: G, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "bag of risotto rice" },
  "orzo": { aisle: G, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "bag of orzo", allergens: ["gluten"] },
  "spaghetti": { aisle: G, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "pack of spaghetti", allergens: ["gluten"] },
  "pasta shapes": { aisle: G, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "pack of small pasta shapes", allergens: ["gluten"] },
  "couscous": { aisle: G, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "pack of couscous", allergens: ["gluten"] },
  "plain flour": { aisle: G, perishability: 0.05, packSize: 1500, packUnit: "g", packLabel: "bag of plain flour", allergens: ["gluten"] },
  "self-raising flour": { aisle: G, perishability: 0.05, packSize: 1500, packUnit: "g", packLabel: "bag of self-raising flour", allergens: ["gluten"] },
  "baking powder": { aisle: G, perishability: 0, packSize: 170, packUnit: "g", packLabel: "tub of baking powder" },
  "desiccated coconut": { aisle: G, perishability: 0.05, packSize: 200, packUnit: "g", packLabel: "bag of desiccated coconut", allergens: ["treeNuts"], note: "coconut is not a UK-regulated tree nut, but flagged here for caution", gramsPerTbsp: 5 },
  "chia seeds": { aisle: G, perishability: 0.05, packSize: 200, packUnit: "g", packLabel: "bag of chia seeds", gramsPerTbsp: 12 },
  "dried apricots": { aisle: G, perishability: 0.1, packSize: 250, packUnit: "g", packLabel: "bag of dried apricots", allergens: ["sulphites"], note: "buy sulphite-free", chokingNote: "chop small and cook until soft — dried fruit is firm, sticky and hard to shift" },
  "cashews": { aisle: G, perishability: 0.1, packSize: 200, packUnit: "g", packLabel: "bag of cashews", allergens: ["treeNuts"], chokingNote: "blitz to a paste or a fine powder. Whole and chopped nuts are unsafe until five years old" },
  "blanched almonds": { aisle: G, perishability: 0.1, packSize: 200, packUnit: "g", packLabel: "bag of blanched almonds", allergens: ["treeNuts"], chokingNote: "blitz to a paste or a fine powder. Whole and chopped nuts are unsafe until five years old" },
  "almond butter": { aisle: G, perishability: 0.1, packSize: 250, packUnit: "g", packLabel: "jar of almond butter", allergens: ["treeNuts"], note: "must be smooth — no whole or chopped nuts before 5 years", gramsPerTbsp: 16, chokingNote: "spread thin or thin it with milk or yoghurt. A spoonful of stiff nut butter can block an airway on its own" },

  /* ---------- Tinned ---------- */
  "chopped tomatoes": { aisle: T, perishability: 0.05, packSize: 400, packUnit: "g", packLabel: "tin of chopped tomatoes" },
  "tinned cherry tomatoes": { aisle: T, perishability: 0.05, packSize: 400, packUnit: "g", packLabel: "tin of cherry tomatoes" },
  "passata": { aisle: T, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "carton of passata" },
  "tomato puree": { aisle: T, display: "tomato purée", perishability: 0.05, packSize: 200, packUnit: "g", packLabel: "tube of tomato purée", gramsPerTbsp: 15 },
  "coconut milk": { aisle: T, perishability: 0.05, packSize: 400, packUnit: "ml", packLabel: "tin of coconut milk" },
  "tinned sardines": { aisle: T, perishability: 0.05, packSize: 120, packUnit: "g", packLabel: "tin of sardines", allergens: ["fish"], note: "in spring water, no added salt — the soft bones mash in and are worth keeping" },
  "tinned mackerel": { aisle: T, perishability: 0.05, packSize: 125, packUnit: "g", packLabel: "tin of mackerel", allergens: ["fish"], note: "in spring water or olive oil, no added salt — never the ones in brine or sauce" },

  /* ---------- Frozen ---------- */
  "frozen mango": { aisle: F, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "bag of frozen mango" },
  "frozen berries": { aisle: F, perishability: 0.05, packSize: 500, packUnit: "g", packLabel: "bag of frozen berries" },

  /* ---------- Herbs & spices ---------- */
  "ground cinnamon": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of ground cinnamon" },
  "ground turmeric": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of ground turmeric" },
  "ground cumin": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of ground cumin" },
  "smoked paprika": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of smoked paprika" },
  "mild curry powder": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of mild curry powder" },
  "garam masala": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of garam masala" },
  "mixed spice": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of mixed spice" },
  "ground cardamom": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of ground cardamom" },
  "nutmeg": { aisle: H, perishability: 0, packSize: 40, packUnit: "g", packLabel: "jar of nutmeg" },
  "dried oregano": { aisle: H, perishability: 0, packSize: 30, packUnit: "g", packLabel: "jar of dried oregano" },
  "black pepper": { aisle: H, perishability: 0, packSize: 50, packUnit: "g", packLabel: "grinder of black pepper" },
  "vanilla extract": { aisle: H, perishability: 0, packSize: 60, packUnit: "ml", packLabel: "bottle of vanilla extract" },
  "garlic granules": { aisle: H, perishability: 0, packSize: 60, packUnit: "g", packLabel: "jar of garlic granules" },

  /* ---------- Other ---------- */
  "olive oil": { aisle: O, perishability: 0, packSize: 500, packUnit: "ml", packLabel: "bottle of olive oil" },
  "rapeseed oil": { aisle: O, perishability: 0, packSize: 500, packUnit: "ml", packLabel: "bottle of rapeseed oil" },
  "coconut oil": { aisle: O, perishability: 0, packSize: 300, packUnit: "g", packLabel: "jar of coconut oil" },
  "vegetable stock": { aisle: O, perishability: 0.05, packSize: 1000, packUnit: "ml", packLabel: "batch of vegetable stock (1 litre)", note: "homemade or low-sodium only; shop-bought stock often contains celery or soya" },
  "chicken stock": { aisle: O, perishability: 0.05, packSize: 1000, packUnit: "ml", packLabel: "batch of chicken stock (1 litre)", note: "homemade or low-sodium only; shop-bought stock often contains celery or soya" },
  "cider vinegar": { aisle: O, perishability: 0, packSize: 500, packUnit: "ml", packLabel: "bottle of cider vinegar" },
  "water": { aisle: O, perishability: 0 },
};

/** What to print for an ingredient, which is not always its catalogue key. */
export function displayName(item: string): string {
  return INGREDIENTS[item]?.display ?? item;
}

/** Ingredients that are always in the cupboard — near-zero weight in overlap scoring. */
export const PANTRY_STAPLES = new Set([
  "olive oil", "rapeseed oil", "coconut oil", "water", "black pepper",
  "baking powder", "plain flour", "self-raising flour", "ground cinnamon",
  "ground turmeric", "ground cumin", "smoked paprika", "mild curry powder",
  "garam masala", "mixed spice", "ground cardamom", "nutmeg", "dried oregano",
  "vanilla extract", "garlic granules", "cider vinegar",
]);

export function meta(item: string): IngredientMeta {
  const m = INGREDIENTS[item];
  if (!m) {
    throw new Error(
      `Unknown ingredient "${item}". Add it to lib/data/ingredients.ts — ` +
        `recipes may only use canonical ingredient names, so that overlap ` +
        `detection and shopping-list merging stay reliable.`
    );
  }
  return m;
}

/** Build an Ingredient from the catalogue. */
export function ing(
  item: string,
  quantity: number | null,
  unit: Unit,
  note?: string,
  optional = false
): Ingredient {
  const m = meta(item);
  return {
    item,
    quantity,
    unit,
    note,
    optional,
    aisle: m.aisle,
    packSize: m.packSize,
    perishability: m.perishability,
  };
}

/** Derive the allergen set for a recipe from its ingredients. */
export function allergensFor(ingredients: Ingredient[]): Allergen[] {
  const set = new Set<Allergen>();
  for (const i of ingredients) {
    for (const a of meta(i.item).allergens ?? []) set.add(a);
  }
  return [...set].sort();
}
