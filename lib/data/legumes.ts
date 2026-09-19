/**
 * The legume exclusion list. PRD §4 — this is the one hard constraint in the app.
 *
 * Exclusion is STRICT BOTANICAL: every member of the
 * family Fabaceae, including peanuts and soya, which are commonly not thought of
 * as legumes at all.
 *
 * Matching is deliberately generous. A false positive costs us one recipe; a false
 * negative puts something in a baby's mouth that shouldn't be there.
 */

export const LEGUME_TERMS: readonly string[] = [
  // Pulses
  "lentil", "lentils", "red lentil", "green lentil", "puy lentil", "beluga lentil",
  "chickpea", "chickpeas", "garbanzo", "gram flour", "besan", "channa", "chana",
  "split pea", "split peas", "dal", "dhal", "daal",

  // Beans
  "bean", "beans", "black bean", "black beans", "kidney bean", "kidney beans",
  "cannellini", "borlotti", "haricot", "butter bean", "butter beans", "lima bean",
  "pinto", "adzuki", "aduki", "mung", "flageolet", "baked beans", "broad bean",
  "broad beans", "fava", "navy bean",

  // Fresh pods
  "pea", "peas", "petit pois", "petits pois", "garden pea", "frozen peas",
  "mangetout", "mange tout", "sugar snap", "snap pea", "snow pea",
  "green bean", "green beans", "french bean", "french beans", "runner bean",
  "runner beans", "edamame",

  // Peanut
  "peanut", "peanuts", "peanut butter", "groundnut", "monkey nut", "arachis",

  // Soya
  "soy", "soya", "soybean", "soya bean", "soybeans", "soya beans", "tofu",
  "tempeh", "miso", "soy sauce", "soya sauce", "tamari", "edamame bean",
  "soya milk", "soya yoghurt", "soya lecithin", "soy lecithin", "textured vegetable protein",

  // Other Fabaceae
  "carob", "fenugreek", "liquorice root", "licorice root", "guar gum",
  "locust bean", "locust bean gum", "tamarind", "lupin", "lupine",
];

/**
 * Terms that contain a legume word as a substring but are NOT legumes.
 * Checked first so "vanilla bean" and "coffee bean" don't trip the filter.
 */
const FALSE_POSITIVES: readonly string[] = [
  "vanilla bean", "vanilla beans", "vanilla pod", "coffee bean", "coffee beans",
  "cocoa bean", "cocoa beans", "cacao bean", "bean sprout", "beansprout",
  "peach", "pear", "pearl barley", "pearl", "appearance", "peanut-free",
  "speak", "repeat",
];

const normalise = (s: string): string => s.toLowerCase().replace(/[^a-z\s-]/g, " ").replace(/\s+/g, " ").trim();

/** Word-boundary match so "pea" doesn't fire on "peach" or "pearl barley". */
function containsTerm(haystack: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`, "i").test(haystack);
}

/**
 * Returns the legume terms found in a piece of text, or an empty array.
 * Used on ingredient names, recipe titles, tips and substitution text.
 */
export function findLegumes(text: string): string[] {
  const n = normalise(text);

  // Strip known false positives before testing.
  let stripped = n;
  for (const fp of FALSE_POSITIVES) {
    stripped = stripped.split(fp).join(" ");
  }

  const hits = new Set<string>();
  for (const term of LEGUME_TERMS) {
    if (containsTerm(stripped, term)) hits.add(term);
  }
  return [...hits];
}

export function isLegumeFree(text: string): boolean {
  return findLegumes(text).length === 0;
}
