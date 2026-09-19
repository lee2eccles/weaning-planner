import type { Aisle, Plan, PlannedMeal, Unit } from "@/lib/types";
import { getRecipe } from "@/lib/data/recipes";
import { INGREDIENTS, PANTRY_STAPLES, meta } from "@/lib/data/ingredients";
import { chooseBatchMultiplier } from "@/lib/planner/portions";
import { isBatchCooked } from "@/lib/planner/constraints";

export interface ShoppingLine {
  item: string;
  aisle: Aisle;
  /**
   * Summed requirement per unit. A single ingredient can legitimately be called
   * for in more than one unit — 60g of chives in one recipe and a handful in
   * another — and it must still be one line on the list.
   */
  amounts: { unit: Unit; quantity: number | null }[];
  /** Whole packs to buy, when the catalogue knows a pack size for this unit. */
  packs?: number;
  packLabel?: string;
  isPantryStaple: boolean;
  note?: string;
  usedIn: string[];
}

export interface ShoppingList {
  sessionIndex: number;
  /** Which days of the plan this shop covers. */
  coversDays: [number, number];
  /** 0 = buy before prep day; later shops are top-ups for fresh meals only. */
  shopIndex: number;
  label: string;
  lines: ShoppingLine[];
}

/** Aisle order that matches walking a supermarket rather than zigzagging it. */
const AISLE_ORDER: Aisle[] = [
  "produce", "bakery", "meatFish", "dairy", "frozen", "tinned", "dryGoods", "herbsSpices", "other",
];

function roundQuantity(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Builds one shopping list per prep session.
 *
 * Works from the meals rather than the prep sheet's cook list, so that no-cook
 * recipes — which are assembled on the day and never batched — still get their
 * ingredients bought.
 */
export function buildShoppingLists(plan: Plan): ShoppingList[] {
  const lists: ShoppingList[] = [];

  for (const session of plan.prepSessions) {
    const sessionMeals = plan.meals.filter((m) => m.prepSessionIndex === session.index);
    if (sessionMeals.length === 0) continue;

    const mealsByRecipe = new Map<string, number>();
    for (const m of sessionMeals) {
      mealsByRecipe.set(m.recipeId, (mealsByRecipe.get(m.recipeId) ?? 0) + 1);
    }

    /**
     * Everything for the batch cook has to be in the house on prep day. But
     * ingredients for meals made fresh on their own morning do not — buying a
     * fortnight of avocados up front just means throwing some away.
     *
     * So each ingredient is filed under the week it is first actually needed,
     * which turns one overwhelming shop into a big one and a small top-up.
     */
    const merged = new Map<string, ShoppingLine & { neededFromDay: number }>();

    for (const [recipeId, mealCount] of mealsByRecipe) {
      const r = getRecipe(recipeId);
      const portionsNeeded = mealCount * plan.settings.eaters;

      const mealsOfThis = sessionMeals.filter((m) => m.recipeId === recipeId);
      const batched = mealsOfThis.some((m) => isBatchCooked(r, m.dayIndex));

      // Batch ingredients are needed on prep day; fresh ones on their own day.
      const neededFromDay = batched
        ? session.dayIndex
        : Math.min(...mealsOfThis.map((m) => m.dayIndex));

      const multiplier = batched
        ? chooseBatchMultiplier(r, portionsNeeded, plan.settings.freezer)
        : portionsNeeded / r.babyPortions;

      for (const i of r.ingredients) {
        const addition = i.quantity == null ? null : i.quantity * multiplier;
        let line = merged.get(i.item);

        if (!line) {
          const m = meta(i.item);
          line = {
            item: i.item,
            aisle: i.aisle,
            amounts: [],
            isPantryStaple: PANTRY_STAPLES.has(i.item),
            note: m.note,
            usedIn: [],
            neededFromDay,
          };
          merged.set(i.item, line);
        }

        // If anything needs it earlier, the earlier date wins.
        line.neededFromDay = Math.min(line.neededFromDay, neededFromDay);

        const slot = line.amounts.find((a) => a.unit === i.unit);
        if (slot) {
          if (addition != null) slot.quantity = roundQuantity((slot.quantity ?? 0) + addition);
        } else {
          line.amounts.push({ unit: i.unit, quantity: addition == null ? null : roundQuantity(addition) });
        }

        if (!line.usedIn.includes(r.title)) line.usedIn.push(r.title);
      }
    }

    // Convert to whole packs using the amount recorded in the pack's own unit.
    for (const line of merged.values()) {
      const m = INGREDIENTS[line.item];
      if (!m?.packSize || !m.packLabel) continue;
      const match = line.amounts.find((a) => a.unit === m.packUnit && a.quantity != null);
      if (!match?.quantity) continue;
      const required = m.packUnit === "piece" ? Math.ceil(match.quantity) : match.quantity;
      line.packs = Math.max(1, Math.ceil(required / m.packSize));
      line.packLabel = m.packLabel;
    }

    // Split into a prep-day shop and any later top-ups, by week.
    const byShop = new Map<number, ShoppingLine[]>();
    for (const line of merged.values()) {
      const weekOffset = Math.floor((line.neededFromDay - session.dayIndex) / 7);
      const shop = Math.max(0, weekOffset);
      const list = byShop.get(shop) ?? [];
      const { neededFromDay, ...rest } = line;
      list.push(rest);
      byShop.set(shop, list);
    }

    const days = sessionMeals.map((m) => m.dayIndex);
    const sessionStart = Math.min(...days);
    const sessionEnd = Math.max(...days);

    for (const [shopIndex, lines] of [...byShop.entries()].sort((a, b) => a[0] - b[0])) {
      const from = sessionStart + shopIndex * 7;
      const to = Math.min(from + 6, sessionEnd);
      lists.push({
        sessionIndex: session.index,
        shopIndex,
        coversDays: [from, to],
        label:
          shopIndex === 0
            ? plan.prepSessions.length > 1
              ? `Prep shop ${session.index + 1}`
              : "Prep day shop"
            : "Top-up — fresh items only",
        lines: lines.sort(
          (a, b) =>
            AISLE_ORDER.indexOf(a.aisle) - AISLE_ORDER.indexOf(b.aisle) ||
            a.item.localeCompare(b.item)
        ),
      });
    }
  }

  return lists;
}

/** Units that read as words and take a plural; tbsp/tsp/g/ml never do. */
const PLURALISES = new Set<string>(["slice", "clove", "sprig", "handful", "pinch", "knob", "splash"]);

/** Vague units, which describe rather than measure. */
const VAGUE: Record<string, string> = {
  handful: "a handful of",
  pinch: "a pinch of",
  knob: "a knob of",
  splash: "a splash of",
  sprig: "a sprig of",
};

/** 3 tsp is a tbsp; listing both is noise on a shopping list. */
function consolidate(amounts: ShoppingLine["amounts"]): ShoppingLine["amounts"] {
  const tsp = amounts.find((a) => a.unit === "tsp");
  const tbsp = amounts.find((a) => a.unit === "tbsp");
  if (!tsp?.quantity || !tbsp) return amounts;
  const merged = Math.round((tbsp.quantity ?? 0) + tsp.quantity / 3, ) * 1;
  return amounts
    .filter((a) => a.unit !== "tsp")
    .map((a) => (a.unit === "tbsp" ? { ...a, quantity: Math.round(merged * 10) / 10 } : a));
}

/** "150g", "2 tbsp", "3" for countable pieces, "" for a handful or a pinch. */
function formatAmount(unit: Unit, quantity: number | null): string {
  if (quantity == null) return "";

  // You cannot buy 0.5 of an avocado, so whole items always round up.
  const q = unit === "piece" ? Math.ceil(quantity) : Math.round(quantity * 100) / 100;

  if (unit === null || unit === "piece") return `${q}`;
  if (unit === "g" || unit === "ml") return `${q}${unit}`;
  if (PLURALISES.has(unit)) return `${q} ${unit}${q === 1 ? "" : "s"}`;
  return `${q} ${unit}`;
}

function formatQuantity(line: ShoppingLine): string {
  const amounts = consolidate(line.amounts);
  const measured = amounts.map((a) => formatAmount(a.unit, a.quantity)).filter(Boolean);

  if (line.packs && line.packLabel) {
    const need = measured.length ? ` (need ${measured.join(" + ")})` : "";
    return `${line.packs} × ${line.packLabel}${need}`;
  }

  // Nothing measurable — "chives" alone reads like a bug, so describe it.
  if (measured.length === 0) {
    const vague = amounts.map((a) => (a.unit ? VAGUE[a.unit] : null)).find(Boolean);
    return vague ? `${vague} ${line.item}` : `${line.item} — to taste`;
  }

  const meta = INGREDIENTS[line.item];
  const countable = amounts.find((a) => a.unit === "piece" && a.quantity != null);
  const name =
    countable && meta?.plural && Math.ceil(countable.quantity!) !== 1 ? meta.plural : line.item;

  return `${measured.join(" + ")} ${name}`;
}

export function formatLine(line: ShoppingLine): string {
  return formatQuantity(line);
}

/** Plain text for the clipboard. PRD §7.1 F5. */
export function shoppingListToText(list: ShoppingList, includeStaples = true): string {
  const lines = list.lines.filter((l) => includeStaples || !l.isPantryStaple);
  const header = `${list.label} — days ${list.coversDays[0] + 1} to ${list.coversDays[1] + 1}`;
  const body = lines.map((l) => `- ${formatQuantity(l)}`).join("\n");
  const staples = list.lines.filter((l) => l.isPantryStaple).length;
  const footer = includeStaples
    ? ""
    : `\n\n(${staples} cupboard staples not listed — check you have them)`;
  return `${header}\n\n${body}${footer}\n`;
}

export function planToText(plan: Plan, dayNames: string[]): string {
  const out: string[] = [`Meal plan — ${plan.settings.weeks} week${plan.settings.weeks > 1 ? "s" : ""}`, ""];
  const totalDays = plan.settings.weeks * 7;

  for (let d = 0; d < totalDays; d++) {
    const label = `${dayNames[d % 7]} (day ${d + 1})`;
    const dayMeals = plan.meals.filter((m) => m.dayIndex === d);
    if (dayMeals.length === 0) continue;
    out.push(label);
    for (const slot of plan.settings.slots) {
      const meal = dayMeals.find((m) => m.slot === slot);
      if (!meal) continue;
      const r = getRecipe(meal.recipeId);
      const state =
        meal.state === "defrost"
          ? `defrost ${meal.cubesToDefrost ?? ""} cubes the night before`.trim()
          : meal.state === "cookToday"
            ? "cook today"
            : meal.state === "fromFridge"
              ? "from the fridge"
              : "make fresh";
      out.push(`  ${slot}: ${r.title} — ${state}`);
    }
    out.push("");
  }
  return out.join("\n");
}
