# Weaning Planner — Product Requirements Document

**Version:** 0.1 (draft for review)
**Date:** 19 September 2026
**Owner:** —
**Status:** Awaiting sign-off before build

---

## 1. Problem

We are weaning twins. The twins are 6–9 months old. One of the twins reacts to legumes, so nothing we cook can contain them. We want to plan 1–4 weeks of breakfasts and lunches at a time, batch-cook them in one session, and walk into a supermarket with a single list.

Doing this by hand is slow and error-prone in three specific ways:

1. **Safety.** Legumes hide in places you don't expect — a "tip" suggesting tofu instead of egg, peas stirred into a fish dish, edamame in a mash. A manual scan misses them.
2. **Waste.** Plan meals independently and you buy a whole beetroot for one recipe, half a bag of spinach for another, and throw away the rest.
3. **Monotony.** Once you remove legumes, the safe recipe pool is small enough that naive planning serves the same lunch five times in a fortnight.

The app exists to solve those three problems. Everything else is secondary.

---

## 2. Goals & non-goals

### 2.1 Goals
- Generate a 1, 2, 3 or 4 week plan of **breakfasts and lunches** for two babies, guaranteed legume-free.
- Maximise **ingredient reuse** across the plan so the shopping list is short and little is wasted.
- Enforce **variety** so no meal becomes repetitive within a week.
- Produce a **batch-cook prep sheet** (what to cook on prep day, what to freeze, what to keep in the fridge) and a **day-by-day chart** (what to defrost, what to serve).
- Produce a **shopping list** with quantities scaled to two babies, copyable as plain text.
- Work on phone, iPad and desktop.

### 2.2 Non-goals (v1)
- Dinners and snacks. Explicitly out of scope — breakfast and lunch only.
- Planning or shopping for adult portions. Six recipes make an adult portion as a by-product; the recipe card says so, but it is not counted, planned or shopped for.
- Nutritional analysis, calorie or macro tracking.
- Accounts, login, or syncing between devices. Data lives in this browser only.
- Tracking which foods each twin liked or rejected.
- Supermarket integration or online ordering.

---

## 3. Users

**Primary:** Two parents. Two adults, both technically comfortable, using this mostly on a phone in the kitchen or in a supermarket aisle, and occasionally on a laptop to plan.

**Usage pattern:** a planning session (sit down, generate a plan, tweak, shop) roughly once a week or fortnight, then repeated quick glances at "what are they eating today" during the week.

---

## 4. The safety constraint — legumes

The exclusion is **strict botanical**. The app treats every member of the family *Fabaceae* as unsafe:

| Category | Excluded ingredients |
|---|---|
| Pulses | lentils (all colours), chickpeas, split peas |
| Beans | black, kidney, cannellini, butter, borlotti, haricot, baked beans, broad beans |
| Fresh pods | peas (incl. frozen and petits pois), mangetout, sugar snap, green beans, runner beans, edamame |
| Peanut | peanuts, peanut butter, peanut flour, groundnut oil |
| Soy | soya beans, tofu, tempeh, edamame, soy sauce, tamari, miso, soya milk/yoghurt, soya lecithin |
| Other | carob, fenugreek, liquorice root, guar gum, locust bean gum |

### 4.1 Rules the app must enforce

- **R1.** A recipe containing any excluded ingredient is never placed in a plan. No exceptions, no override toggle in v1.
- **R2.** Exclusion applies to **variations and tips too**, not just the main ingredient list. A tip suggesting tofu in place of egg is as much of a problem as an ingredient line, and is caught by the same scan.
- **R3.** Every recipe carries an explicit `legumeStatus` of `safe`, `contains` or `adapted`. There is no "unknown" state — an unclassified recipe cannot enter the pool.
- **R4.** Recipes are written legume-free from the start rather than adapted, so there is no substitution to display and nothing for a cook to reverse by accident (§5.4).
- **R5.** A permanent, dismissible-per-session banner or badge states the plan is legume-free, so a second cook (grandparent, babysitter) understands the constraint.

**Note:** this is a family dietary management tool, not a medical device. The app should carry a short line stating it is not medical advice and that suspected allergies should be confirmed with a GP or dietitian. Guidance on excluding a whole food group from an infant's diet should come from a clinician.

### 4.2 Allergen flagging

Legumes are the only **hard exclusion**. Every other allergen is **flagged, not filtered** — recipes containing them stay fully plannable, but carry a visible badge so we can see at a glance what a meal exposes the twins to.

This matters for two reasons. First, weaning guidance is to introduce common allergens deliberately and early, one at a time, not to avoid them — so the app should make exposure visible rather than hidden. Second, if either twin reacts to something new, a labelled plan lets us look back at what they ate and when.

The app tracks the 14 UK-regulated allergens. Those actually present in this library:

| Allergen | Appears in |
|---|---|
| Milk | Most recipes — whole milk, cheddar, parmesan, ricotta, cream cheese, Greek yoghurt, butter |
| Eggs | Scrambled egg, eggy bread, frittata squares, egg muffins, muffins, pancakes, fishcakes |
| Fish | Cod, haddock, salmon, hake |
| Cereals containing gluten | Bread, pasta, orzo, spaghetti, couscous, flour, oats (unless certified GF) |
| Tree nuts | Almond butter, blanched almonds, cashews, desiccated coconut |
| Sulphites | Dried apricots — buy sulphite-free, which the app carries through as a shopping-list note |

Requirements:

- **R6.** Every recipe carries an `allergens` array. Recipe cards and plan-grid cells show allergen badges.
- **R7.** A filter on the recipe library lets us view by allergen, so "show me everything with egg" is one tap.
- **R8.** A **first-exposure highlight**: when a plan introduces an allergen the twins haven't had in any previous plan, the app marks that meal. Introducing one new allergen at a time, on a day when we're around to watch, is the standard advice.
- **R9.** Allergen flags never affect planner selection. They are informational only. Legumes remain the sole exclusion.

---

## 5. Recipe library

### 5.1 Where the recipes came from

The project started from photographs of a weaning cookbook we own, which we used to work out
what a sensible 7–9 month library looks like: the meal shapes, the portion conventions, the
freezer and fridge keeping times, and which dishes suit batch cooking.

**Every recipe in the app is now our own.** The library was rewritten so that nothing in this
repository reproduces anyone else's text. Ingredient lists are not copyrightable — they are
statements of fact — but method prose, headnotes and tips are, and reproducing them would
have meant this repository could only ever be private. Rewriting them removed that constraint
entirely rather than managing it.

Concretely: all titles, method text, blurbs and notes are original; there are no page
references or citations back to any book; the five legume-based dishes that could never be
planned were dropped rather than documented; and a test asserts that no recipe carries a
`page` or `basedOn` field, so the constraint cannot quietly erode.

Dish *concepts* — cod with potato and sweetcorn, cheese and tomato orzo, broccoli pesto —
are common weaning combinations and not anyone's property.

### 5.2 The library

| Slot | Core | Extra | **Total** |
|---|---|---|---|
| Breakfast | 7 | 6 | **13** |
| Lunch | 13 | 9 | **22** |

Some recipes serve both slots, so the totals overlap. Over four weeks that is roughly 2.2
servings of each breakfast and 1.3 of each lunch — inside the twice-weekly variety rule with
enough slack that the planner optimises for ingredient overlap rather than being forced into
repeats.

`CORE_RECIPES` (`lib/data/recipes.core.ts`) is the base library. `EXTRA_RECIPES`
(`lib/data/recipes.app.ts`, written up in [RECIPES-ADDITIONAL.md](RECIPES-ADDITIONAL.md))
widens it deliberately using the ingredient base the core recipes already establish, so
variety rises faster than the shopping list does.

### 5.3 Iron

NHS weaning guidance for 7–9 months names **meat, fish, fortified cereals, dark green
vegetables, and beans and lentils** as the iron sources that matter once a baby's own stores
begin to run down at around six months.

Beans and lentils are excluded here. That removes one of the five, and makes the remaining
four load-bearing in a way they would not be in an ordinary weaning plan.

The app therefore tracks `ironRich` on every recipe and offers a "Good for iron" filter, so
it is easy to see whether a week has enough of them. Recipes carrying it include the spiced
lamb, the chicken dishes, all the fish, the egg-based breakfasts and the spinach dishes.

### 5.4 Legume exclusion is structural, not a substitution

Because the library is ours, nothing is an "adapted" version of a legume recipe. Dishes that
would conventionally use peas or green beans are simply written with sweetcorn, courgette or
tenderstem from the start. There is no substitution to display and nothing to diverge from.

The `legumeStatus` field and the `PLANNABLE_RECIPES` filter remain as a structural guarantee:
if a recipe containing legumes were ever added, it could not reach a plan.

### 5.5 Recipe data model

```ts
type LegumeStatus = 'safe' | 'contains' | 'adapted';
type MealSlot = 'breakfast' | 'lunch';
type Source = 'core' | 'extra';

interface Ingredient {
  item: string;            // canonical name, used for overlap + list merging
  quantity: number | null; // null for "handful of", "squeeze of"
  unit: 'g' | 'ml' | 'tbsp' | 'tsp' | 'piece' | 'handful' | 'pinch' | null;
  note?: string;           // "peeled and diced small"
  optional?: boolean;
  aisle: Aisle;            // for future grouping; captured now, unused in v1 UI
  packSize?: number;       // typical supermarket pack, for waste-aware planning
}

interface Recipe {
  id: string;
  title: string;
  source: Source;
  slots: MealSlot[];       // a recipe may serve more than one slot
  ageBandMonths: number;   // minimum age, e.g. 6 or 7
  babyPortions: number;    // NORMALISED yield — see §5.6
  feedsAdultToo: boolean;  // "family meal" recipes
  freezable: 'yes' | 'no' | 'partial';
  freezableNote?: string;  // "lamb only", "pesto only", "mash only"
  freezeFormat: 'cube' | 'openFreeze' | 'none';  // see §6.5.2
  fridgeDays: number;      // 2, 3 or 4
  activeMinutes: number;
  longRecipe: boolean;     // needs a real slot of time, not ten minutes
  noCook: boolean;
  specialEquipment?: string[];
  ingredients: Ingredient[];
  method: string[];
  tips: string[];          // legume-containing tips already stripped
  legumeStatus: LegumeStatus;
  allergens: Allergen[];   // flagged, never filtered — see §4.2
  saltAware: boolean;       // two or more salty components — don't pair on one day
  ironRich: boolean;        // a meaningful iron source — see §5.3
  vegetarian: boolean;
  glutenFree: boolean;
  componentOf?: string[];  // sub-recipes, e.g. p80 butternut-cinnamon-almond butter
  usesLeftover?: string;   // e.g. Beetroot Pancakes uses leftover plain porridge
}
```

### 5.6 Portion normalisation

Recipes yield inconsistently — tablespoons of porridge, whole fritters, a pan that feeds an adult and a baby. Planning needs one unit, so everything converts to **baby portions**, where one baby portion is what one of the twins eats at one meal:

- `MAKES n TBSP` → `n / 4` baby portions (4 tbsp ≈ one 7–9 month portion)
- `MAKES n PORTIONS` → `n`
- `MAKES 1 ADULT AND 1 BABY PORTION` → `3` baby portions (the adult portion covers roughly two baby portions), and `feedsAdultToo: true`
- Countable items (muffins, fritters, pancakes, squares) → an explicit per-recipe figure, e.g. 20 fritters = 5 baby portions at 4 fritters each

**Every meal slot consumes 2 baby portions** (one per twin). The planner computes batch multipliers from this: if a recipe yields 3 baby portions and the plan wants it served twice, it needs 4 portions, so cook 1.5× — rounded up to 2× with the surplus noted as a spare freezer portion.

These conversion ratios are assumptions and should be checked against real appetite after a week of use. They are defined in one constants file so they are trivial to tune.

---

## 6. The planning algorithm

This is the core of the product and the part most worth getting right.

### 6.1 Inputs
- Number of weeks (1–4)
- Meal slots (breakfast, lunch — both on by default)
- Prep day (default Sunday)
- Number of eaters (fixed at 2 in v1)
- Freezer settings: cube volume, cubes per tray, tray count (see §6.5)
- Optional: recipes to exclude this round (a "not this week" toggle)

### 6.2 Hard constraints
- **H1.** No recipe with `legumeStatus: 'contains'`.
- **H2.** No recipe whose `ageBandMonths` exceeds the twins' current age band.
- **H3.** The same recipe never appears on two consecutive days in the same slot.
- **H4.** A recipe appears at most **twice per week** in the same slot.
- **H5.** Every meal is either (a) cooked that day, (b) from the fridge within `fridgeDays` of its cook date, or (c) from the freezer and marked for defrost the evening before. A fridge-only recipe with `fridgeDays: 2` cooked on Sunday cannot be scheduled for Wednesday.
- **H6.** Non-freezable recipes (`freezable: 'no'`) may only be scheduled within their fridge window of a cook session, or **cooked fresh on the day** — which applies to anything under 15 minutes' hands-on time that is not a longer recipe. Scrambled egg is an eight-minute job; treating it as freezer-or-nothing both wasted freezer space and, in a first cut of the prep sheet, produced an instruction to batch-cook eight portions of eggy bread on day 1 to be eaten on day 9. Food that is cooked fresh is never part of the prep-day batch.
- **H7.** Total cubes held in the freezer at any point never exceeds `freezerCapacityCubes`.
- **H8.** A single prep session never covers more than **2 weeks**. A 3 or 4 week plan is split into two prep sessions and two shops.
- **H9.** A freezing wave never exceeds `trayCount x cubesPerTray` cubes; excess is scheduled into a later wave (§6.5.3).

### 6.3 Optimisation objective

Given constraints, the planner scores candidate assignments and chooses greedily with a randomised restart (run the greedy pass ~200 times with different seeds, keep the best-scoring plan). This is fast enough to run in the browser and avoids needing a real solver.

Score for adding recipe *r* to slot *s*, higher is better:

```
score(r, s) =  W_overlap  * ingredientOverlap(r, planSoFar)
             + W_pack     * packEfficiency(r, planSoFar)
             + W_variety  * daysSinceLastUsed(r, s)
             + W_leftover * leftoverChainBonus(r, planSoFar)
             + W_tray     * trayFit(r, batchMultiplier)
             - W_effort   * effortPenalty(r, s)
             - W_repeat   * timesUsedThisWeek(r)
```

- **ingredientOverlap** — count of canonical ingredients *r* shares with already-selected recipes, weighted by perishability. Sharing fresh spinach matters far more than sharing olive oil, because the spinach is what goes off. Pantry staples are weighted near zero.
- **packEfficiency** — rewards plans that consume whole supermarket packs. If the plan already needs 1 of a 2-pack of beetroot, a second beetroot recipe scores well. This is the anti-waste term.
- **daysSinceLastUsed** — pushes repeats apart. Enforces the *spirit* of H3/H4 beyond the hard minimum.
- **leftoverChainBonus** — several recipes genuinely feed each other: the Pink Beetroot Pancakes want leftover cooked porridge, and one roasted sweet potato serves both the Frittata Squares and the Sweet Potato Pancakes. Scheduling the producer before the consumer is materially smarter planning and is rewarded and surfaced in the UI.
- **trayFit** — mildly rewards batch sizes that fill whole 7-cube trays, so nothing is left over in an awkward 2-cube remainder (§6.5.1a). Low weight: a tie-breaker, not a driver.
- **effortPenalty** — discourages stacking several `longRecipe` items into one prep session, and discourages scheduling a cook-fresh recipe on a weekday.

Default weights go in one config object, exposed nowhere in the UI for v1 but easy to tune in code.

### 6.4 Outputs

1. **Plan grid.** Weeks × days × slots. Each cell: recipe name, and a state badge — `Cook today` / `From fridge` / `Defrost N cubes tonight`.
2. **Prep sheet, one per week.** What to cook on prep day, batch multiplier for each recipe, how many portions go to fridge vs freezer, and a suggested order of cooking that shares oven time and pans where possible.
3. **Shopping list, one per prep cycle** — a fortnightly shop, so a 4-week plan yields two lists (see §6.5). Quantities summed across recipes and scaled by batch multipliers, converted to sensible purchase units (e.g. 340g spinach → "2 bags of spinach").
4. **Freezer sheet.** Bags to make, each with its cube count and label text, plus the wave schedule for filling trays (§6.5.3).

### 6.5 Freezer model: trays, cubes and bags

Food is frozen in **ice cube trays**, then popped out and stored in **labelled freezer bags**. This is the right call and it changes the model meaningfully: bagged cubes stack flat and pack into gaps, so raw storage volume stops being the binding constraint. Two new constraints take its place — **tray throughput on prep day**, and **portion granularity**.

#### 6.5.1 The unit is the cube

| Setting | Default | Notes |
|---|---|---|
| `cubeVolumeMl` | **30** | Confirmed — matches a standard silicone weaning tray |
| `cubesPerTray` | **7** | Confirmed |
| `trayCount` | **6** | Confirmed — this is the prep-day bottleneck |
| `freezeHours` | 6 | How long until cubes are solid enough to pop out and bag |

Derived from these:

- **1 baby portion** = 60ml = `ceil(60 / cubeVolumeMl)` cubes → **2 cubes** at the default
- **1 meal for both twins** = **4 cubes**
- **Cubes per freezing wave** = `trayCount x cubesPerTray` → **42**
- **One tray** = 7 cubes = 3.5 baby portions ≈ **1¾ meals for both twins**

#### 6.5.1a One recipe per tray

Six trays of seven is a better shape than three of fourteen, and the app should lean on it. Most single-batch recipes in this library yield **4–9 cubes**, which is roughly one tray each. That makes the natural working rule:

> **One recipe per tray. Six recipes per wave. One bag per tray.**

This matters beyond tidiness. The single biggest risk in cube-and-bag storage is losing track of which cubes are which — and a legume-free plan that relies on guessing is not a legume-free plan. With 14-cube trays you inevitably split a tray between two recipes and try to remember which half was which. With 7-cube trays you don't have to: tray → bag is one recipe, end to end, and the label written in §6.5.4 describes the whole bag accurately.

**Whole-tray batch sizing.** The planner should prefer batch multipliers that land near a multiple of 7 cubes, so trays come out full and there's no awkward 2-cube remainder sitting in a tub. This is a new soft term in the scoring function:

```
+ W_tray * trayFit(r, batchMultiplier)    // rewards yields near a multiple of cubesPerTray
```

It is a *soft* preference, deliberately. Rounding a recipe up to fill a tray is good when it means one extra portion; it's bad when it means cooking 40% more food than the plan needs. The weight should be low enough that it breaks ties rather than driving decisions.

The granularity is the quiet win here. With pots you defrost a fixed portion. With cubes you defrost 3 instead of 4 on a day they're not hungry, or 5 when they are, and appetite changes between 7 and 9 months don't invalidate a freezer full of food.

#### 6.5.2 Three freeze formats

Not everything cubes. Every recipe carries a `freezeFormat`:

| Format | What it means | Recipes |
|---|---|---|
| `cube` | Wet, spoonable or blendable — goes straight into trays | Porridges, orzo and pasta dishes, risottos, congee, mashes, pestos, sauces, the Moroccan lamb, the avocado mash |
| `openFreeze` | Solid items — freeze flat on a lined tray, then bag once hard | Pancakes, muffins, fritters, frittata squares, fishcakes, meatballs |
| `none` | Not freezable | Scrambled egg, eggy bread, toast fingers, overnight oats, the beetroot yoghurt dip |

`openFreeze` items compete for the same freezer shelf space and the same 6-hour window as the trays, so the planner counts them against throughput too — a baking tray of fishcakes occupies the wave just as a tray of cubes does.

Pesto is worth calling out: both pesto recipes are freezable *pesto only*, and pesto is close to the ideal cube candidate. Two cubes of cashew pesto plus freshly cooked pasta is a four-minute lunch from frozen.

#### 6.5.3 Tray throughput — the real prep-day constraint

**H9.** A prep session cannot freeze more than `trayCount x cubesPerTray` cubes at once. Beyond that, freezing happens in **waves**, each taking `freezeHours` before the trays are free again.

> **Corrected during the build.** This section originally assumed a fortnight came to ~68 cubes and two waves, and that a third wave was a problem to be designed around. Building it showed otherwise: a fortnight is 56 baby portions, and once fridge meals and open-frozen items are removed it still lands at **2–3 waves**. Three is fine, because **the waves do not all have to happen on prep day** — cook everything at once, keep what is waiting in the fridge, and let the later waves run overnight. The warning threshold is therefore four waves, not three.

A fortnight is 14 days x 2 slots x 2 portions = 56 baby portions. After the prep-day meals, the 2-day fridge window and the open-frozen items, that lands at roughly **55–65 cubes** — **two or three waves** of your 6 trays. Spread as morning, afternoon and overnight, with the waiting food in the fridge, that is a normal prep day rather than an ordeal.

The prep sheet must therefore be **wave-aware**, and say so plainly:

> **Wave 1 (morning) — 6 trays, 42 cubes.**
> Tray 1 Butternut Porridge · Tray 2 Chicken, Leek and Sweetcorn Rice Pot · Tray 3 Cashew Pesto
> Tray 4 Courgette, Lemon and Cheddar Orzo · Tray 5 Mushroom and Spinach Risotto · Tray 6 Haddock, Leek and Sweetcorn Mash
> Freeze 6 hours.
>
> **Wave 2 (evening) — pop wave 1 into 6 labelled bags, refill.**
> Tray 1 Mango and Coconut Porridge · Tray 2 Carrot and Cumin Sauce · Tray 3 Cheese and Tomato Orzo · Tray 4 Cod, Spinach and Potato
> Plus open-freeze on a lined baking tray: Banana and Oat Pancakes, Salmon Fishcakes.

When a plan needs more waves than fit comfortably in a day, the planner resolves in this order, same as before: shift meals onto the no-cook pool, then propose a short mid-fortnight top-up cook, then warn — naming the shortfall in **trays**, and noting that a seventh tray is usually the cheapest fix — at 7 cubes each they are small and cheap to add.

#### 6.5.4 Bags and labelling

- **One recipe per bag, one tray per bag.** Cubes from different recipes are indistinguishable once frozen, and guessing is how a legume-free plan stops being legume-free. The 7-cube trays make this the natural path rather than a discipline to maintain (§6.5.1a).
- The app generates **label text** for each bag: recipe name, date frozen, cube count, cubes per baby portion, use-by date, and allergen badges. Printable, or short enough to write on the bag with a marker.
- **Freezer inventory (F13)** tracks bags and their remaining cube counts, decremented as meals are marked eaten, so the app knows what's actually in there rather than what was theoretically made.

#### 6.5.5 Storage safety

Standard rules, surfaced in the app:

- Cool food completely before freezing. Never put warm food in a freezer.
- Freeze within 24 hours of cooking; use within **1 month** for best quality.
- Defrost in the fridge overnight, never at room temperature.
- Reheat until piping hot all the way through, then **cool before serving** — reheated food burns mouths.
- **Never refreeze** anything that has been defrosted.
- Sterilise trays before first use; keep a dedicated set for baby food.

#### 6.5.6 Capacity

With cubes in bags, volume is no longer the limit — 68 cubes at 30ml is about 2 litres, which will fit where 14 pots would not. Capacity remains a setting (`freezerCapacityCubes`, default 200) as a backstop, but the warnings that will actually fire are the tray-throughput ones.

### 6.6 Manual override

Automation that can't be corrected is worse than no automation. Users must be able to:
- Swap any single meal for another eligible recipe (a picker showing only legume-safe, age-appropriate options).
- Lock a meal so regeneration doesn't move it.
- Regenerate the whole plan, or one week, keeping locked meals.
- Delete a meal entirely (leaving a gap, for a day out).

Any manual edit triggers recalculation of the shopping list and prep sheet, and re-validates H5/H6 — warning if a fridge-life rule has been broken, without blocking it.

---

## 7. Feature requirements

### 7.1 Must have (v1)

| ID | Feature |
|---|---|
| F1 | Plan generator: choose 1–4 weeks, generate, regenerate |
| F2 | Plan grid view, responsive — week columns on desktop/iPad, day-by-day scroll on phone |
| F3 | Recipe detail view: ingredients scaled to selected batch size, method, tips, keeping times |
| F4 | Recipe library browser: filter by slot, safe/unsafe, freezable, vegetarian, gluten-free |
| F5 | Shopping list: merged quantities, purchase-unit conversion, copy-to-clipboard as plain text |
| F6 | Batch prep sheet per week |
| F7 | Manual meal swap and lock |
| F8 | Persistence: current plan, locks and settings survive a page refresh and browser restart |
| F9 | Legume-free assurance: constraint enforced, and visibly communicated |
| F10 | Safety notes panel for 6–9 months (see §8) |
| F11 | Allergen badges on recipes and plan cells, plus allergen filter and first-exposure highlighting (§4.2) |
| F12 | Tray/cube/bag settings, wave-aware prep sheets, throughput warnings (§6.5) |
| F13 | Freezer inventory: bags, remaining cube counts, date frozen, use-by |
| F14 | Bag label generator — recipe, date, cube count, cubes per portion, allergens (§6.5.4) |

### 7.2 Should have (v1 if time allows)
- "Today" view — a single screen showing just today's breakfast and lunch plus tonight's defrost reminder
- Print stylesheet for the shopping list and prep sheet
- Export plan as text

### 7.3 Explicitly deferred
- Cross-device sync
- Dinners and snacks
- Per-twin separate plans

**Un-deferred after the first UX review.** Aisle grouping, pantry-staple hiding and
tick-off-as-you-shop were originally deferred on your instruction. A design review of the
built app put the tickable list first among all possible improvements, on the grounds that
Shop is the highest-dwell screen in the worst conditions — one hand, a trolley, two babies —
and without check-off the parent holds their place in a 24-line list from memory, which is
exactly the working memory a sleep-deprived person does not have. All three are now built.


---

## 8. Safety content (6–9 months)

The app displays a persistent, collapsible safety panel. These are standard NHS weaning guidelines and several directly affect recipes in this library:

- **No honey** before 12 months (risk of infant botulism).
- **No added salt.** Use homemade or low-sodium stock. Several recipes here use cheese, parmesan and stock, which carry meaningful salt — the app should flag recipes with two or more salty components so they aren't served on consecutive days.
- **No added sugar.**
- **No whole nuts** before 5 years. Ground nuts and smooth nut butters are fine, and appear in this library (almond butter, cashew pesto, blanched almonds) — the app should note these must be fully ground or smooth.
- **Cow's milk** is fine in cooking from 6 months, but not as a main drink before 12 months.
- **Choking hazards:** grapes and cherry tomatoes quartered lengthways; food cut to finger-size strips for self-feeding; nothing round and firm.
- **Whole eggs** must be cooked through unless British Lion stamped.

The panel closes with the line that this is general guidance, not medical advice, and that a suspected food reaction should be reviewed with a GP or dietitian.

---

## 9. Design

### 9.1 Palette

Base colours as specified:

| Token | Hex | Use |
|---|---|---|
| `sage` | `#A6ACA1` | Primary surfaces, headers, nav, plan-grid cell backgrounds |
| `blush` | `#E1B4A5` | Accent — active states, primary buttons, "cook today" badges |
| `ink` | `#2E322D` | All body text and headings |
| `ink-muted` | `#5C6158` | Secondary text, labels |
| `cream` | `#FAF8F5` | Page background |
| `sage-tint` | `#E8EAE5` | Subtle fills, table stripes, disabled states |
| `blush-tint` | `#F5E3DC` | Highlight fills |
| `alert` | `#8C3A2B` | Legume warnings and unsafe badges — a desaturated brick that sits in the palette rather than a default red |

**Accessibility constraint:** both brand colours are mid-tone. White text fails WCAG AA on each (`#FFF` on `sage` ≈ 2.3:1; on `blush` ≈ 1.9:1). Therefore **text is always `ink` on coloured surfaces, never white.** `ink` on `sage` ≈ 5.9:1 and on `blush` ≈ 7.5:1, both passing AA. This rule is non-negotiable and should be enforced by only exposing token combinations that pass.

Dark mode is out of scope for v1.

### 9.2 Layout

Mobile-first, three breakpoints:

- **Phone (<640px).** Single column. Plan shown as a vertical day list, one card per day with breakfast and lunch stacked. Bottom tab bar: Plan / Shop / Recipes / Prep.
- **iPad (640–1024px).** Two columns. Plan shown as a 7-column week grid, one week visible at a time with week tabs. Comfortable touch targets — this is the most likely kitchen-counter device.
- **Desktop (>1024px).** Sidebar navigation, full multi-week grid, recipe detail in a side panel rather than a full-page navigation.

Typography: one clean sans (system stack or Inter) at generous sizes — this gets read at arm's length on a counter with messy hands. Minimum 16px body.

### 9.3 Key screens

1. **Plan** — the home screen. Week selector, the grid, per-meal state badges, tap a meal for detail, long-press or menu for swap/lock.
2. **Today** — cut-down view: two meals and tonight's defrost list.
3. **Shop** — the merged list, week toggle, copy button.
4. **Prep** — per-week cook sheet with batch multipliers and portioning instructions.
5. **Recipes** — browsable library with filters; unsafe recipes shown greyed with a clear "contains legumes" badge and the reason.
6. **Settings** — weeks, slots, prep day, safety panel, and a plain-English statement of the legume exclusion list.

---

## 10. Technical approach

| Concern | Decision |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS with the palette above defined as theme tokens |
| State | React state + a small store (Zustand or context); no server state |
| Persistence | `localStorage`, wrapped in try/catch with a schema version field for future migrations |
| Recipe data | Typed TypeScript modules in the repo — no CMS, no database |
| Rendering | Fully static, no server components requiring a runtime |
| Hosting | Vercel, deployed from the GitHub repo on push to `main` — **deferred** until the app runs locally and you've seen it (§12.4) |
| Testing | Unit tests on the planner: legume exclusion, fridge-life rules, portion maths, shopping-list merging. These are the parts where a silent bug is costly. |

**On persistence:** you chose browser-only. The consequence worth naming is that the plan will not appear on your partner's phone, and clearing site data loses it. The mitigation in v1 is export-as-text (§7.2) so a plan can be shared manually. If that friction bites, moving to a shared store is a contained change — the data layer sits behind one module deliberately so it can be swapped without touching the planner or UI.

**Repo structure:**

```
/app                  routes: plan, today, shop, prep, recipes, settings
/components           UI components
/lib
  /data
    recipes.core.ts       the core library
    recipes.app.ts        additional recipes
    ingredients.ts        canonical names, aisles, pack sizes, perishability
    legumes.ts            the exclusion list
  /planner
    generate.ts           the algorithm
    score.ts              scoring functions
    constraints.ts        H1–H6
    portions.ts           normalisation and batch maths
  /shopping
    merge.ts              quantity merging and unit conversion
  /storage
    local.ts              localStorage wrapper, schema versioning
/tests
```

---

## 11. Success criteria

The app works if:

1. A generated 4-week plan contains **zero** legume-containing ingredients. Verified by an automated test over every recipe in every generated plan.
2. No lunch or breakfast appears more than twice in any single week, and never on consecutive days.
3. A 2-week plan's shopping list contains **fewer distinct ingredients than the sum of its recipes' ingredients** — measurably demonstrating reuse. Target: at least 35% fewer.
4. Generating a 4-week plan takes under one second in the browser.
5. The whole flow — open app, generate, review, copy shopping list — takes under two minutes on a phone.
6. Nothing violates fridge-life rules, and no prep session schedules more cubes into a wave than the trays can hold.
7. Every recipe in every plan displays a complete and correct allergen badge set.

---

## 12. Decisions

Resolved 19 September 2026. Recorded here so the reasoning survives.

| # | Question | Decision |
|---|---|---|
| 1 | Allergies beyond legumes | **Flag, don't filter.** Legumes are the only hard exclusion. All other allergens are badged on recipes and plans, with first-exposure highlighting. See §4.2. |
| 2 | Freezer capacity | **Two weeks of prep, limited space.** Prep sessions capped at a fortnight; longer plans split into two prep sessions and two shops. See §6.5. |
| 2a | Storage format | **Ice cube trays, then labelled freezer bags.** The cube becomes the portion unit (2 cubes = 1 baby portion at 30ml). Binding constraint shifts from storage volume to tray throughput on prep day. See §6.5. |
| 2b | Tray kit | **6 trays x 7 cubes x 30ml = 42 cubes per wave.** Confirmed. Drives one-recipe-per-tray batching and whole-tray batch sizing. See §6.5.1a. |
| 3 | Adult "family meal" portions | **Not planned.** Babies only. The adult portion is noted on the recipe card as a by-product, but isn't counted or shopped for. |
| 4 | GitHub and Vercel | **Build first, wire up later.** No repo is created and nothing is deployed until you've seen the app working locally. |
| 5 | Equal appetites | **Assumed yes** — 2 baby portions per meal slot. Conversion ratios live in one constants file and are easy to tune after a week of real use. |
| 6 | Age progression | **Age band is a setting.** Recipes carry a minimum age, so moving to 10–12 months widens the pool automatically. Moving up would mean writing more recipes. |

### 12.1 Still genuinely unknown

- Whether 6 hours is right for your freezer to set 30ml cubes solid. If it's faster, both waves fit in a morning. Worth timing once on the first prep day — it's a setting.
- Whether the tbsp-to-portion ratios in §5.6 match what the twins actually eat.

---

## 13. Build sequence

1. Scaffold Next.js + Tailwind + palette tokens, running locally. No repo, no deployment yet.
2. Build the typed recipe data, with legume classification, iron flags and full ingredient canonicalisation.
3. Write the recipe library — 19 core recipes plus the 15 in RECIPES-ADDITIONAL.md.
4. Build portion normalisation and the constraint layer, with tests.
5. Build the planner and scoring, with tests.
6. Build the shopping-list merge, with tests.
7. Build the UI screens, mobile-first.
8. Persistence and manual overrides.
9. Safety panel and copy.
10. Polish, responsive passes on phone and iPad, print styles.

11. Once you've seen it working: initialise the git repo, create the GitHub remote, connect Vercel.

Steps 4–6 carry the real risk — legume exclusion, fridge-life rules, freezer capacity and portion maths — and should be covered by tests before any UI is built on top of them. Step 11 happens only on your say-so.

---

## 14. Appendix: freeze format by recipe

Working classification for §6.5.2. `cube` goes into ice cube trays; `openFreeze` goes flat on a lined baking tray then into a bag; `none` is fridge-only. Cube counts assume 30ml cubes, so 2 cubes = 1 baby portion.

### Book recipes

| Recipe | Format | Cubes yielded | Note |
|---|---|---|---|
| Quinoa and Pear Porridge | cube | ~4 | Thin with a little milk on reheating |
| Butternut Porridge | cube | ~9 | Ideal cube candidate |
| Turmeric Scrambled Egg | none | — | Egg goes rubbery; cook fresh |
| Eggy Bread with Strawberry Yoghurt | none | — | Cook fresh |
| Spinach, Banana and Sweetcorn Muffins | openFreeze | — | 12 muffins, bag once hard |
| Blackberry and Apple Baked Oats | openFreeze | — | Cut into portions first, freeze flat |
| Beetroot Porridge Pancakes | openFreeze | — | Interleave with parchment |
| Cheese and Tomato Orzo | cube | ~6 | |
| Beetroot, Greek Yoghurt and Lemon Dip | none | — | Yoghurt splits on freezing |
| Moroccan Minced Lamb (lamb only) | cube | ~6 | Couscous made fresh — it takes 5 minutes |
| Creamy Chicken, Broccoli and Mushroom Pasta | cube | ~6 | |
| Cod, Spinach, Potato *(adapted)* | cube | ~6 | |
| White Fish Congee *(adapted)* | cube | ~4 | |
| Sweet Potato Frittata Squares *(adapted)* | openFreeze | — | ~20 squares |
| Sweetcorn and Ricotta Fritters | none | — | Book says fridge only; respect it |
| Cheesy Quinoa Risotto *(adapted)* | cube | ~6 | |
| Broccoli, Basil and Cashew Pesto (pesto only) | cube | ~5 | Excellent frozen — pasta fresh on the day |
| Red Pepper Pesto *(adapted)*, pesto only | cube | ~4 | As above |
| Avocado Mash Flatbread *(adapted)*, mash only | cube | ~2 | Lime juice slows browning |

### Authored recipes

| Recipe | Format | Cubes yielded | Note |
|---|---|---|---|
| B1 Banana and Oat Pancakes | openFreeze | — | 12 pancakes, parchment between layers |
| B2 Apple, Cinnamon and Yoghurt Overnight Oats | none | — | Made the night before |
| B3 Butternut and Cheddar Egg Muffins | openFreeze | — | 12 muffins |
| B4 Mango and Coconut Porridge | cube | ~6 | |
| B5 Ricotta and Berry Toast Fingers | none | — | Assembled fresh |
| B6 Sweet Potato and Cinnamon Pancakes | openFreeze | — | 14 pancakes |
| L1 Courgette, Lemon and Cheddar Orzo | cube | ~8 | |
| L2 Salmon, Sweet Potato and Dill Fishcakes | openFreeze | — | Freeze raw, cook from frozen |
| L3 Cauliflower Cheese Pasta Bake | openFreeze | — | Portion before freezing |
| L4 Chicken, Leek and Sweetcorn Rice Pot | cube | ~8 | |
| L5 Carrot, Cumin and Cream Cheese Pasta (sauce only) | cube | ~6 | Pasta fresh on the day |
| L6 Mushroom, Spinach and Parmesan Risotto | cube | ~8 | |
| L7 Mini Beef and Butternut Meatballs | openFreeze | — | Sauce cubes separately, ~4 |
| L8 Haddock, Leek and Sweetcorn Mash | cube | ~8 | |
| L9 Avocado, Cream Cheese and Cucumber Toast | none | — | Assembled fresh |

### Balance check

Of 34 plannable recipes: **16 cube**, **9 open-freeze**, **9 fridge-only**.

That mix works. The cube recipes carry the bulk of the batch cooking; the open-freeze items (pancakes, muffins, fishcakes) are mostly breakfasts and grab-and-go, which is exactly where you want them; and the 9 fridge-only recipes are the pressure valve the planner uses when tray throughput is tight (§6.5.3).

One caution worth building in: **the sauce-only and pesto-only recipes are the most efficient things in the library.** A cube of pesto or carrot sauce plus fresh pasta is a genuinely fast meal and uses minimal freezer space. The planner's scoring should mildly favour them when the freezer is under pressure.
