import type { Plan, PrepSession, Recipe } from "@/lib/types";
import { planDays } from "@/lib/planner/coverage";
import { ALLERGEN_LABELS } from "@/lib/types";
import { INGREDIENTS, displayName } from "@/lib/data/ingredients";
import { batchLabel, scaleIngredients } from "@/lib/planner/portions";

/**
 * Plain text for the clipboard.
 *
 * This is the app's answer to "save it to my notes": a recipe or a whole saved
 * list, formatted so that pasting it into Notes, Reminders or a message leaves
 * something a person can actually cook from with the phone locked and the app
 * closed. No markdown — Notes renders asterisks as asterisks.
 */

const WORD_UNITS = new Set(["slice", "clove", "sprig", "handful", "pinch", "knob", "splash"]);

function amount(quantity: number | null, unit: string | null): string {
  if (quantity == null) return "";
  if (unit == null || unit === "piece") return `${quantity} `;
  if (unit === "g" || unit === "ml") return `${quantity}${unit} `;
  if (WORD_UNITS.has(unit)) return `${quantity} ${unit}${quantity === 1 ? "" : "s"} `;
  return `${quantity} ${unit} `;
}

/** "1 cube" not "1 cubes". */
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** "2 eggs", not "2 egg". */
function ingredientName(item: string, unit: string | null, quantity: number | null): string {
  const meta = INGREDIENTS[item];
  if (unit === "piece" && quantity != null && quantity !== 1 && meta?.plural) return meta.plural;
  return displayName(item);
}

export function recipeToText(recipe: Recipe, note?: string, scale = 1): string {
  const out: string[] = [recipe.title, ""];
  if (scale !== 1) out.push(`${batchLabel(scale)} — every quantity below is already scaled`, "");

  const portions = Math.round(recipe.babyPortions * scale * 10) / 10;
  out.push(
    `Makes ${portions} baby portion${portions === 1 ? "" : "s"}` +
      (recipe.cubesYielded ? ` (about ${Math.round(recipe.cubesYielded * scale)} cubes)` : "") +
      ` · about ${recipe.activeMinutes} minutes hands-on`
  );
  if (recipe.allergens.length > 0) {
    out.push(`Contains: ${recipe.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ")}`);
  }
  out.push("");

  out.push("INGREDIENTS");
  for (const i of scaleIngredients(recipe, scale)) {
    out.push(
      `- ${amount(i.quantity, i.unit)}${ingredientName(i.item, i.unit, i.quantity)}${i.note ? ` — ${i.note}` : ""}${
        i.optional ? " (optional)" : ""
      }`
    );
  }
  out.push("");

  out.push("METHOD");
  recipe.method.forEach((step, i) => out.push(`${i + 1}. ${step}`));

  if (recipe.tips.length > 0) {
    out.push("", "TIPS");
    for (const t of recipe.tips) out.push(`- ${t}`);
  }

  out.push(
    "",
    `Keeps ${recipe.fridgeDays} day${recipe.fridgeDays === 1 ? "" : "s"} in the fridge` +
      (recipe.freezable !== "no" ? " · freezes for 1 month" : " · does not freeze")
  );

  if (note?.trim()) out.push("", "MY NOTE", note.trim());

  out.push("", "Legume-free — no beans, lentils, chickpeas, peas, green beans, peanuts or soya.");
  return out.join("\n");
}

/** The saved list itself — titles, timings and any notes, for pasting somewhere. */
export function savedListToText(recipes: Recipe[], notes: Record<string, string> = {}): string {
  if (recipes.length === 0) return "No saved recipes yet.";

  const out: string[] = [`Saved recipes (${recipes.length})`, ""];
  for (const r of recipes) {
    out.push(`- ${r.title} — ${r.slots.join(" and ")}, about ${r.activeMinutes} min`);
    const note = notes[r.id]?.trim();
    if (note) out.push(`    ${note.split("\n").join("\n    ")}`);
  }
  return out.join("\n");
}

/**
 * The prep sheet as plain text, with every quantity already scaled. Prep was
 * the only screen in the app you could not take away with you — and it is the
 * one you stand in front of for two hours with wet hands.
 */
export function prepSessionToText(
  session: PrepSession,
  recipeOf: (id: string) => Recipe,
  cubesPerPortion: number,
  swaps: Record<string, string> = {},
  cooked: Set<string> = new Set()
): string {
  const out: string[] = [];
  out.push(`Prep session — day ${session.dayIndex + 1}`);
  out.push("");

  out.push("COOK — in this order, so whatever fills wave 1 goes in the pan first");
  for (const [n, item] of session.cook.entries()) {
    const r = recipeOf(item.recipeId);
    out.push("");
    out.push(`${n + 1}. ${r.title} — ${batchLabel(item.batchMultiplier)}${
      cooked.has(item.recipeId) ? "  ✓ done" : ""
    }`);
    out.push(
      `  Makes about ${item.portionsProduced} baby portions` +
        (item.toFridgePortions > 0 ? ` · ${item.toFridgePortions} to the fridge` : "") +
        (item.toFreezerCubes > 0 ? ` · ${item.toFreezerCubes} cubes to the freezer` : "") +
        (item.toFreezerPortions > 0
          ? ` · ${item.toFreezerPortions} portions frozen flat on a tray`
          : "")
    );
    for (const i of scaleIngredients(r, item.batchMultiplier)) {
      const swap = swaps[i.item];
      out.push(
        `  - ${amount(i.quantity, i.unit)}${ingredientName(i.item, i.unit, i.quantity)}${
          i.note ? ` — ${i.note}` : ""
        }` + (swap ? `  [shop note: ${swap}]` : "")
      );
    }
    r.method.forEach((step, n) => out.push(`  ${n + 1}. ${step}`));
  }

  if (session.cookFresh.length > 0) {
    out.push("", "MAKE FRESH ON THE DAY");
    for (const item of session.cookFresh) {
      const r = recipeOf(item.recipeId);
      const days = [...new Set(item.dayIndices)].map((d) => d + 1).join(", ");
      out.push(`- ${r.title} — day${days.includes(",") ? "s" : ""} ${days}`);
    }
  }

  out.push("", "FREEZING");
  for (const wave of session.waves) {
    out.push(`Wave ${wave.waveNumber}`);
    for (const t of wave.trays) {
      out.push(`  Tray ${t.trayNumber} — ${recipeOf(t.recipeId).title} (${plural(t.cubes, "cube")})`);
    }
    wave.openFreezeRecipeIds.forEach((id, n) =>
      out.push(`  Baking tray ${n + 1} — ${recipeOf(id).title} (freeze flat, then bag)`)
    );
  }

  out.push("", `${cubesPerPortion} cubes = 1 baby portion.`);
  out.push(
    "Cool completely before freezing. Freeze within 24 hours, use within 1 month.",
    "Defrost in the fridge overnight. Reheat piping hot, then cool. Never refreeze."
  );
  return out.join("\n");
}

/**
 * One day, as a message to the other parent.
 *
 * This is the handover: they are holding their own phone, which has none of
 * this, and it is 6pm. Everything they need is on the Today screen already —
 * which meal, what is in it, and what to take out of the freezer tonight — so
 * this is that screen as a message, short enough to read in a notification.
 */
export function dayToText(
  plan: Plan,
  dayIndex: number,
  recipeOf: (id: string) => Recipe,
  notes: Record<string, string> = {}
): string {
  const totalDays = planDays(plan.settings);
  const out: string[] = [`Day ${dayIndex + 1} of ${totalDays}`, ""];

  for (const meal of plan.meals.filter((m) => m.dayIndex === dayIndex)) {
    const r = recipeOf(meal.recipeId);
    const allergens = r.allergens.length
      ? ` (${r.allergens.map((a) => ALLERGEN_LABELS[a].toLowerCase()).join(", ")})`
      : "";
    const state =
      meal.state === "defrost"
        ? "from the freezer"
        : meal.state === "cookToday"
          ? `cook it — about ${r.activeMinutes} min`
          : meal.state === "fromFridge"
            ? "in the fridge"
            : "make it fresh";
    out.push(`${meal.slot}: ${r.title}${allergens} — ${state}`);
    const note = notes[r.id]?.trim();
    if (note) out.push(`  note: ${note}`);
  }

  const tomorrow = plan.meals.filter((m) => m.dayIndex === dayIndex + 1 && m.state === "defrost");
  if (tomorrow.length > 0) {
    out.push("", "Take out of the freezer tonight:");
    for (const m of tomorrow) {
      const amount = m.cubesToDefrost
        ? `${m.cubesToDefrost} cubes`
        : `${m.portionsToDefrost ?? 1} portion${(m.portionsToDefrost ?? 1) === 1 ? "" : "s"}`;
      out.push(`- ${amount} of ${recipeOf(m.recipeId).title}`);
    }
    out.push("Defrost in the fridge overnight, reheat piping hot, then cool.");
  }

  return out.join("\n");
}
