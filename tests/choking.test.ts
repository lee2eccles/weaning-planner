import { describe, it, expect } from "vitest";
import { INGREDIENTS, meta } from "@/lib/data/ingredients";
import { PLANNABLE_RECIPES } from "@/lib/data/recipes";

/**
 * Choking guidance, checked the way the legume rule is checked.
 *
 * The shapes that block an infant airway are well known — round and firm,
 * or sticky and stiff — and the instruction that makes each safe belongs on
 * the ingredient, not in the prose of whichever recipe happened to remember.
 * Six of the nine sweetcorn recipes had said nothing at all.
 */

/** Foods in this library that need preparing before a baby can have them. */
const HAZARDS = [
  "sweetcorn", "cherry tomatoes", "strawberries", "blueberries", "carrot",
  "dried apricots", "cashews", "blanched almonds", "almond butter",
];

/**
 * Catalogue entries whose name suggests a hazard shape but which are safe as
 * bought or as used. Reviewed once, listed here, so that the scan below can
 * fail on anything new rather than on these.
 */
const REVIEWED_SAFE = new Set([
  // Cooked down, never served as a whole fruit.
  "tinned cherry tomatoes", "chopped tomatoes", "passata", "tomato puree",
  // Soft enough to squash against the roof of the mouth.
  "raspberries", "blackberries", "frozen berries",
  // Small, soft once wet, and used by the spoonful in a wet mixture.
  "chia seeds",
]);

describe("choking guidance", () => {
  it("states what to do for every hazard in the library", () => {
    for (const item of HAZARDS) {
      expect(INGREDIENTS[item], `${item} is not in the catalogue`).toBeDefined();
      const note = meta(item).chokingNote;
      expect(note, `${item} carries no preparation guidance`).toBeTruthy();
      expect(note!.length, `${item}'s guidance is too terse to act on`).toBeGreaterThan(20);
    }
  });

  it("catches a new ingredient that looks like a hazard and says nothing", () => {
    // The shapes: round and firm, stone fruit, nuts, dried fruit, raw hard veg.
    // Word boundaries matter here: "butternut", "coconut" and "chestnut" are
    // not nuts, and "self-raising" is not a raisin.
    const suspicious =
      /\bnuts?\b|\balmonds?\b|\bcashews?\b|peanut|berry|berries|\bgrapes?\b|corn\b|tomato|\bdried (apricot|fruit|fig|date|cranberr)|\braisins?\b|\bsultanas?\b|\bolives\b|\bseeds?\b|\bcherries\b|\bcarrot/i;
    const missed: string[] = [];
    for (const [item, m] of Object.entries(INGREDIENTS)) {
      if (!suspicious.test(item)) continue;
      if (REVIEWED_SAFE.has(item) || m.chokingNote) continue;
      missed.push(item);
    }
    expect(
      missed,
      `these read as choking hazards but carry no guidance — add a chokingNote, ` +
        `or add them to REVIEWED_SAFE with a reason: ${missed.join(", ")}`
    ).toEqual([]);
  });

  it("puts the guidance in front of the cook on every recipe that uses one", () => {
    // The note lives on the ingredient and is rendered from the catalogue, so
    // it reaches every recipe automatically. This asserts the wiring: no
    // recipe can use a hazard and show nothing.
    for (const r of PLANNABLE_RECIPES) {
      for (const i of r.ingredients) {
        if (!HAZARDS.includes(i.item)) continue;
        expect(
          meta(i.item).chokingNote,
          `${r.title} uses ${i.item} with no guidance attached`
        ).toBeTruthy();
      }
    }
  });

  /**
   * The action a cook has to take, per hazard, somewhere in the method.
   *
   * The note on the ingredient line says what to do; this asserts the method
   * says it too, at the step where it happens. A recipe should be followable
   * top to bottom without having to cross-reference the ingredients for the
   * one instruction that is about safety rather than flavour.
   */
  const ACTION: Record<string, RegExp> = {
    "sweetcorn": /crush|chop|blitz|pulse|blend|purée|puree/i,
    "cherry tomatoes": /quarter|chop|blitz|blend|purée|puree/i,
    "strawberries": /crush|mash|quarter|chop|blend/i,
    "blueberries": /crush|squash|halve|halved|blend/i,
    "carrot": /grate|grated|soft|blend|blitz|mash|steam|purée|puree/i,
    "dried apricots": /chop|blitz|blend|soak/i,
    "cashews": /grind|ground|blitz|blend|process/i,
    "blanched almonds": /grind|ground|blitz|blend|process/i,
    "almond butter": /stir|ripple|thin|spread|blend|loosen/i,
  };

  it("tells the cook to do it, in the method, at the step it happens", () => {
    const missing: string[] = [];
    for (const r of PLANNABLE_RECIPES) {
      const method = r.method.join(" ");
      for (const i of r.ingredients) {
        const action = ACTION[i.item];
        if (!action) continue;
        if (!action.test(method)) missing.push(`${r.title} → ${i.item}`);
      }
    }
    expect(
      missing,
      `these use a hazard but the method never says to prepare it: ${missing.join("; ")}`
    ).toEqual([]);
  });

  it("covers the sweetcorn recipes that used to say nothing", () => {
    const corn = PLANNABLE_RECIPES.filter((r) =>
      r.ingredients.some((i) => i.item === "sweetcorn")
    );
    expect(corn.length).toBeGreaterThan(5);
    expect(meta("sweetcorn").chokingNote).toMatch(/crush|chop|blitz/i);
  });
});
