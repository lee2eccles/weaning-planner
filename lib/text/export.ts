import type { PrepSession, Recipe } from "@/lib/types";
import { ALLERGEN_LABELS } from "@/lib/types";
import { displayName } from "@/lib/data/ingredients";
import { batchLabel, scaleIngredients } from "@/lib/planner/portions";

/**
 * Plain text for the clipboard.
 *
 * This is the app's answer to "save it to my notes": a recipe or a whole saved
 * list, formatted so that pasting it into Notes, Reminders or a message leaves
 * something a person can actually cook from with the phone locked and the app
 * closed. No markdown — Notes renders asterisks as asterisks.
 */

function amount(quantity: number | null, unit: string | null): string {
  if (quantity == null) return "";
  if (unit == null || unit === "piece") return `${quantity} `;
  if (unit === "g" || unit === "ml") return `${quantity}${unit} `;
  return `${quantity} ${unit} `;
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
      `- ${amount(i.quantity, i.unit)}${displayName(i.item)}${i.note ? ` — ${i.note}` : ""}${
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
  swaps: Record<string, string> = {}
): string {
  const out: string[] = [];
  out.push(`Prep session — day ${session.dayIndex + 1}`);
  out.push("");

  out.push("COOK");
  for (const item of session.cook) {
    const r = recipeOf(item.recipeId);
    out.push("");
    out.push(`${r.title} — ${batchLabel(item.batchMultiplier)}`);
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
        `  - ${amount(i.quantity, i.unit)}${displayName(i.item)}${i.note ? ` — ${i.note}` : ""}` +
          (swap ? `  [shop note: ${swap}]` : "")
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
      out.push(`  Tray ${t.trayNumber} — ${recipeOf(t.recipeId).title} (${t.cubes} cubes)`);
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
