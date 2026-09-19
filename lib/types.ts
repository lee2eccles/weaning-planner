/** Domain model. See PRD.md §5.5. */

export type LegumeStatus = "safe" | "contains" | "adapted";
export type MealSlot = "breakfast" | "lunch";
export type Source = "core" | "extra";
export type FreezeFormat = "cube" | "openFreeze" | "none";
export type Freezable = "yes" | "no" | "partial";

/** The 14 UK-regulated allergens. Flagged, never filtered — PRD §4.2. */
export type Allergen =
  | "milk"
  | "eggs"
  | "fish"
  | "crustaceans"
  | "molluscs"
  | "gluten"
  | "peanuts"
  | "treeNuts"
  | "soya"
  | "sesame"
  | "celery"
  | "mustard"
  | "lupin"
  | "sulphites";

export const ALLERGEN_LABELS: Record<Allergen, string> = {
  milk: "Milk",
  eggs: "Eggs",
  fish: "Fish",
  crustaceans: "Crustaceans",
  molluscs: "Molluscs",
  gluten: "Gluten",
  peanuts: "Peanuts",
  treeNuts: "Tree nuts",
  soya: "Soya",
  sesame: "Sesame",
  celery: "Celery",
  mustard: "Mustard",
  lupin: "Lupin",
  sulphites: "Sulphites",
};

export type Aisle =
  | "produce"
  | "dairy"
  | "meatFish"
  | "bakery"
  | "dryGoods"
  | "tinned"
  | "frozen"
  | "herbsSpices"
  | "other";

export const AISLE_LABELS: Record<Aisle, string> = {
  produce: "Fruit & veg",
  dairy: "Dairy & chilled",
  meatFish: "Meat & fish",
  bakery: "Bakery",
  dryGoods: "Dry goods",
  tinned: "Tinned & jars",
  frozen: "Frozen",
  herbsSpices: "Herbs & spices",
  other: "Other",
};

export type Unit =
  | "g"
  | "ml"
  | "tbsp"
  | "tsp"
  | "piece"
  | "handful"
  | "pinch"
  | "slice"
  | "clove"
  | "sprig"
  | "splash"
  | "knob"
  | null;

export interface Ingredient {
  /** Canonical name — the key used for overlap detection and list merging. */
  item: string;
  quantity: number | null;
  unit: Unit;
  note?: string;
  optional?: boolean;
  aisle: Aisle;
  /** Typical supermarket pack size in the ingredient's own unit. */
  packSize?: number;
  /** 0 = pantry staple (never wasted), 1 = highly perishable. Drives overlap weighting. */
  perishability: number;
}

export interface Recipe {
  id: string;
  title: string;
  source: Source;
  slots: MealSlot[];
  ageBandMonths: number;
  /** Normalised yield in baby portions — PRD §5.6. */
  babyPortions: number;
  feedsAdultToo: boolean;
  freezable: Freezable;
  freezableNote?: string;
  freezeFormat: FreezeFormat;
  /** Cubes yielded when freezeFormat is "cube", at 30ml cubes. */
  cubesYielded?: number;
  fridgeDays: number;
  activeMinutes: number;
  longRecipe: boolean;
  noCook: boolean;
  specialEquipment?: string[];
  ingredients: Ingredient[];
  method: string[];
  tips: string[];
  legumeStatus: LegumeStatus;
  allergens: Allergen[];
  /** Two or more salty components — don't pair on one day. */
  saltAware: boolean;
  /**
   * A meaningful source of iron. Matters more here than in most weaning plans:
   * NHS guidance names beans and lentils among the main iron foods for 7–9
   * months, and those are excluded, so meat, fish and dark greens carry it.
   */
  ironRich: boolean;
  vegetarian: boolean;
  glutenFree: boolean;
  usesLeftover?: string;
  blurb?: string;
}

/* ---------- Planning ---------- */

export interface FreezerSettings {
  cubeVolumeMl: number;
  cubesPerTray: number;
  trayCount: number;
  freezeHours: number;
  freezerCapacityCubes: number;
}

export interface PlanSettings {
  weeks: number;
  slots: MealSlot[];
  prepDayIndex: number; // 0 = Monday
  ageBandMonths: number;
  eaters: number;
  freezer: FreezerSettings;
}

export type MealState = "cookToday" | "fromFridge" | "defrost" | "noCook";

export interface PlannedMeal {
  dayIndex: number; // 0-based across the whole plan
  slot: MealSlot;
  recipeId: string;
  state: MealState;
  /** Cubes to take out the night before, when state is "defrost". */
  cubesToDefrost?: number;
  locked: boolean;
  /** Which prep session produced this meal's food. */
  prepSessionIndex: number;
}

export interface TrayAssignment {
  trayNumber: number;
  recipeId: string;
  cubes: number;
}

export interface FreezeWave {
  waveNumber: number;
  trays: TrayAssignment[];
  openFreezeRecipeIds: string[];
}

export interface CookItem {
  recipeId: string;
  batchMultiplier: number;
  portionsProduced: number;
  cubesProduced: number;
  toFridgePortions: number;
  toFreezerCubes: number;
}

/** A meal cooked from scratch on its own day rather than batched on prep day. */
export interface CookFreshItem {
  recipeId: string;
  dayIndices: number[];
}

export interface PrepSession {
  index: number;
  /** Day index within the plan on which cooking happens. */
  dayIndex: number;
  coversDayIndices: number[];
  cook: CookItem[];
  /** Quick recipes made on the morning — never batched, never stored. */
  cookFresh: CookFreshItem[];
  waves: FreezeWave[];
  warnings: string[];
}

export interface Plan {
  id: string;
  createdAt: string;
  /** ISO yyyy-mm-dd of day 1, so "Today" means today and not day one. */
  startDate: string;
  settings: PlanSettings;
  meals: PlannedMeal[];
  prepSessions: PrepSession[];
  warnings: string[];
}

export interface BagLabel {
  recipeId: string;
  title: string;
  cubes: number;
  cubesPerPortion: number;
  frozenOn: string;
  useBy: string;
  allergens: Allergen[];
}
