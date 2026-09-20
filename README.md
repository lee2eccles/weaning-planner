# Weaning Planner

Legume-free meal planning and batch prep for the twins. Plan by days, by weeks or
by the number of portions you need; it tells you what to cook on prep day, how to
fill the ice cube trays, and what to buy.

Built from [PRD.md](PRD.md). Additional recipes in [RECIPES-ADDITIONAL.md](RECIPES-ADDITIONAL.md).

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # 133 tests
npm run build
```

Requires Node 20+.

## What it does

- **Plan** — generates 1–28 days of breakfasts and lunches, guaranteed legume-free.
  Say how much food you need in whatever unit you are thinking in — days, weeks, or
  baby portions — and set how many babies are eating. Swap or lock any meal;
  regenerating keeps locked meals, and asks first if it would clear your shopping ticks.
- **Today** — the actual calendar day's meals, and what to take out of the freezer tonight.
- **Shop** — one merged list per shop, grouped by aisle, tickable as you go with your place
  remembered, staples hidden, and copyable as text. Note what happened to any line —
  out of stock, skipping it, or what you bought instead — and the note turns up on prep
  day against every recipe that needs that ingredient. Splits into a prep-day shop and a small
  week-two top-up, so you are not buying a fortnight of avocados up front.
- **Prep** — what to batch-cook, with **every quantity already multiplied by the batch**,
  the method beside it, and a tick per recipe so "have I done the fishcakes?" has an answer
  two hours in. Plus what to make fresh on the day, which recipe goes in which tray, in which
  freezing wave, what to write on each bag, and the total hands-on time before you start.
  Copyable as plain text, because the kitchen is where the signal goes.
- **Recipes** — the whole library, searchable by title, ingredient or plain words like
  "quick" or "iron". Save the ones you cook from and keep your own notes against them:
  saved recipes are nudged into future plans, sorted to the top of the swap picker, and
  your note shows on the meal card on the day you serve it. Copy a recipe or the whole
  saved list into your notes app. The search is in the URL, so a filtered view can be
  bookmarked or sent to the other parent.
- **Settings** — plan size, tray kit, age band, safety notes, and the full legume exclusion list.

## The three things that matter

**Legumes are excluded, strictly.** Every member of Fabaceae — pulses, beans, peas,
green beans, edamame, peanuts, soya. The exclusion is enforced in three independent
places: recipes are hand-classified, `lib/data/build.ts` re-scans every recipe's own
text at module load and throws if a declaration disagrees, and the test suite checks
every meal of every generated plan across many seeds. A hand-declared safety flag that
nothing verifies is exactly the kind of thing that silently goes wrong.

**Other allergens are flagged, not filtered.** Weaning guidance is to introduce
allergens deliberately and early. The app badges the 14 UK-regulated allergens and
marks first exposures once you have started recording meals as eaten.

**The freezer is the real constraint.** A fortnight of two lunches a day is 28 baby
portions; add breakfasts and it is 56. Food is
frozen in 6 trays × 7 cubes × 30ml, so 2 cubes is one baby portion and 4 cubes is one
meal for both twins. The planner keeps each freezing wave inside the trays available,
leans on the cook-fresh and no-cook pool when space runs short, and caps a prep session
at a fortnight — so a 4-week plan is two prep sheets and two shops.

## Layout

```
app/                 routes: plan, today, shop, prep, recipes, settings
components/          UI
lib/
  data/
    legumes.ts         the exclusion list and matcher
    ingredients.ts     canonical names, aisles, pack sizes, perishability, allergens
    build.ts           recipe builder — derives allergens, verifies legume status
    recipes.core.ts    the core recipe library
    recipes.app.ts     additional recipes, written up in RECIPES-ADDITIONAL.md
    recipes.quick.ts   the fifteen-minutes-or-less library
    search.ts          recipe search — titles, ingredients and plain-language tags
  planner/
    coverage.ts        days, weeks or portions — all three into a number of days
    constraints.ts     H1–H9 — the rules a plan may never break
    score.ts           overlap, pack efficiency, variety, leftover chains, tray fit
    generate.ts        greedy solve with randomised restarts
    portions.ts        portion and cube maths
  shopping/merge.ts    quantity merging and pack conversion
  text/export.ts       plain text for a notes app — a recipe, or the saved list
  storage/local.ts     localStorage, the only module that touches persistence
tests/                 133 tests, weighted to the planner, the legume rule and past bugs
```

## Offline

The shopping list is used in a supermarket, which is exactly where the signal goes. A
service worker (`public/sw.js`) caches the app shell so every tab still opens with no
connection, and a quiet bar says when you are offline. Network-first for pages, so you
never see a stale one while you have signal; cache-first only for build-hashed assets,
which cannot go stale. Registration is production-only.

## Data

Everything lives in the browser's localStorage — the plan, shopping ticks, saved
recipes and your notes. Nothing syncs between devices —
that was a deliberate choice to keep the app free and simple. `lib/storage/local.ts`
is the only module that touches storage, so moving to a shared database later means
changing one file.

Clearing the plan keeps your saved recipes and notes — they take weeks to build up and
are not part of any one plan. Deleting them is a separate, explicit button.

## Recipes

Every recipe here is our own. The project began from photographs of a weaning cookbook we own,
which we used to work out what a sensible 7–9 month library looks like — meal shapes, portion
conventions, fridge and freezer times. The recipes were then written from scratch, so nothing
in this repository reproduces anyone else's text, and a test asserts that no recipe carries a
page reference or cites a source.

All recipes follow NHS weaning guidance for 7–9 months: no added salt or sugar, no honey
before twelve months, no whole nuts, cow's milk in cooking only, and textures and shapes
appropriate for a baby learning to feed themselves.

**Iron is tracked deliberately.** NHS guidance names beans and lentils among the main iron
foods at this age, and they are excluded here — so meat, fish, eggs and dark greens have to
carry it. Recipes are flagged `ironRich` and the Recipes tab has a filter for them.

## Not medical advice

General weaning guidance only. A suspected food reaction should be reviewed
with a GP or dietitian — excluding a whole food group from an infant's diet is worth
doing with clinical support.
