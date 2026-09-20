import type { Recipe } from "@/lib/types";
import { ing } from "./ingredients";
import { recipe } from "./build";

/**
 * The quick library — nothing here takes more than fifteen minutes hands-on.
 *
 * These exist because the honest constraint on weaning is not skill or
 * equipment, it is the twenty minutes between one nap and the next. Everything
 * below is either assembled cold, made in one pan, or built on something the
 * plan has already cooked.
 *
 * The usual rules hold: legume-free by construction, no added salt, no added
 * sugar, no honey before twelve months, nothing whole and round.
 */
export const QUICK_RECIPES: Recipe[] = [
  /* ================= BREAKFASTS ================= */
  recipe({
    id: "quick-banana-chia-yoghurt-pot",
    title: "Banana, Chia and Yoghurt Pot",
    source: "extra",
    blurb: "Five minutes and no heat at all. The chia thickens as it sits, so it is better made the night before than rushed in the morning.",
    slots: ["breakfast"], ageBandMonths: 7,
    babyPortions: 2, feedsAdultToo: false,
    freezable: "no", freezeFormat: "none", fridgeDays: 2,
    activeMinutes: 5, longRecipe: false, noCook: true,
    ingredients: [
      ing("banana", 1, "piece", "very ripe"),
      ing("greek yoghurt", 150, "g", "full fat, plain"),
      ing("chia seeds", 2, "tsp"),
      ing("ground cinnamon", null, "pinch"),
      ing("almond butter", 1, "tsp", "smooth, optional", true),
    ],
    method: [
      "Mash the banana to a smooth purée with a fork — no lumps, no slices.",
      "Stir it through the yoghurt with the chia seeds and cinnamon.",
      "Leave it in the fridge for at least twenty minutes, or overnight, so the chia swells and the pot thickens.",
      "Loosen with a splash of milk if it has set too firm, and ripple the almond butter through just before serving.",
    ],
    tips: [
      "Chia seeds must be fully soaked before serving — dry seeds swell in the mouth.",
      "Plain full-fat yoghurt only. Fruit yoghurts carry a surprising amount of added sugar.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: false,
    vegetarian: true, glutenFree: true,
  }),

  recipe({
    id: "quick-berry-almond-porridge",
    title: "Berry and Almond Butter Porridge",
    source: "extra",
    blurb: "Frozen berries are picked ripe and cost a fraction of fresh ones, and they collapse into the oats as they cook, which saves a step.",
    slots: ["breakfast"], ageBandMonths: 7,
    babyPortions: 3, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 10, longRecipe: false, noCook: false,
    ingredients: [
      ing("porridge oats", 40, "g"),
      ing("whole milk", 300, "ml"),
      ing("frozen berries", 80, "g"),
      ing("almond butter", 2, "tsp", "smooth"),
      ing("ground cinnamon", null, "pinch"),
    ],
    method: [
      "Put the oats, milk and frozen berries straight into a small pan over a medium heat.",
      "Cook for 6–8 minutes, stirring, until the berries have broken down and the oats are soft and creamy.",
      "Crush any whole berries against the side of the pan — blueberries and similar are a choking hazard whole.",
      "Take it off the heat, stir in the almond butter and cinnamon, and cool to barely warm.",
    ],
    tips: [
      "Use certified gluten-free oats if you are avoiding gluten.",
      "Freezes well in cubes. Reheat until piping hot, then cool before it goes anywhere near a baby.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: false,
    vegetarian: true, glutenFree: false,
  }),

  recipe({
    id: "quick-spinach-cheddar-omelette-fingers",
    title: "Spinach and Cheddar Omelette Fingers",
    source: "extra",
    blurb: "Egg and dark greens together are one of the better iron combinations available without pulses, and it cuts into strips a baby can hold.",
    slots: ["breakfast", "lunch"], ageBandMonths: 7,
    babyPortions: 2, feedsAdultToo: false,
    freezable: "no", freezeFormat: "none", fridgeDays: 1,
    activeMinutes: 10, longRecipe: false, noCook: false,
    ingredients: [
      ing("spinach", 40, "g", "washed"),
      ing("egg", 2, "piece", "beaten"),
      ing("cheddar", 20, "g", "finely grated"),
      ing("unsalted butter", 1, "tsp"),
      ing("black pepper", null, "pinch", "optional", true),
    ],
    method: [
      "Wilt the spinach in a dry non-stick pan for a minute, tip it onto a board and chop it finely — long strands are hard for a baby to manage.",
      "Beat the spinach and cheese into the eggs.",
      "Melt the butter in the pan over a low-medium heat, pour in the egg and cook gently for 3–4 minutes.",
      "Flip or fold and cook for another 2 minutes, until set right through with no glossy patches.",
      "Cool, then cut into finger-width strips.",
    ],
    tips: [
      "Eggs must be cooked through unless they carry the British Lion stamp.",
      "A low heat is what keeps it soft — a hot pan gives you a rubbery omelette a baby will refuse.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true,
    vegetarian: true, glutenFree: true,
  }),

  recipe({
    id: "quick-avocado-egg-smash-toast",
    title: "Avocado and Egg Smash on Toast Fingers",
    source: "extra",
    blurb: "The egg does the iron and the avocado does the texture, which means it holds together on a strip of toast instead of sliding off it.",
    slots: ["breakfast", "lunch"], ageBandMonths: 7,
    babyPortions: 2, feedsAdultToo: false,
    freezable: "no", freezeFormat: "none", fridgeDays: 1,
    activeMinutes: 12, longRecipe: false, noCook: false,
    ingredients: [
      ing("egg", 1, "piece"),
      ing("avocado", 0.5, "piece", "ripe"),
      ing("lemon", null, "splash", "juice only"),
      ing("brown bread", 2, "slice", "toasted, crusts off"),
    ],
    method: [
      "Lower the egg into boiling water and cook for 9 minutes, so the yolk is firm all the way through.",
      "Cool it under cold water, peel, and mash with the avocado and a squeeze of lemon.",
      "Toast the bread, cut off the crusts and slice into fingers.",
      "Spread the smash on thickly — thin spread falls off on the way to the mouth.",
    ],
    tips: [
      "Nine minutes is deliberate: a runny yolk is only safe with British Lion eggs, and firm travels better anyway.",
      "The lemon is there to stop the avocado browning, not for flavour.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true,
    vegetarian: true, glutenFree: false,
  }),

  /* ================= LUNCHES ================= */
  recipe({
    id: "quick-sardine-tomato-toast",
    title: "Sardine and Tomato Toast Fingers",
    source: "extra",
    blurb: "Probably the highest-iron ten minutes in the library, and the soft tinned bones bring calcium with them. Oily fish twice a week is the guidance; this is the easy half of it.",
    slots: ["lunch"], ageBandMonths: 7,
    babyPortions: 2, feedsAdultToo: false,
    freezable: "no", freezeFormat: "none", fridgeDays: 1,
    activeMinutes: 10, longRecipe: false, noCook: false,
    ingredients: [
      ing("tinned sardines", 60, "g", "drained"),
      ing("cherry tomatoes", 4, "piece", "quartered lengthways"),
      ing("cream cheese", 1, "tbsp"),
      ing("lemon", null, "splash", "juice only"),
      ing("brown bread", 2, "slice", "toasted, crusts off"),
    ],
    method: [
      "Mash the drained sardines thoroughly with a fork, bones and all, until the texture is even and no firm pieces are left.",
      "Stir in the cream cheese and a squeeze of lemon to soften the flavour.",
      "Warm the quartered tomatoes in a small pan for two minutes until they slump, then stir them through.",
      "Spread onto toast fingers and serve just warm.",
    ],
    tips: [
      "Buy sardines in spring water with no added salt — tomato sauce and brine versions are far too salty for a baby.",
      "Quarter cherry tomatoes lengthways. Whole or halved they are the classic choking hazard.",
      "Oily fish is capped at two portions a week for children.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true,
    vegetarian: false, glutenFree: false,
  }),

  recipe({
    id: "quick-mackerel-potato-sweetcorn-smash",
    title: "Mackerel, Potato and Sweetcorn Smash",
    source: "extra",
    blurb: "A fishcake without the shaping, the crumbing or the frying. Microwaving the potato is what brings it inside fifteen minutes.",
    slots: ["lunch"], ageBandMonths: 7,
    babyPortions: 3, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 15, longRecipe: false, noCook: false,
    ingredients: [
      ing("potato", 250, "g", "peeled and cubed small"),
      ing("tinned mackerel", 80, "g", "drained"),
      ing("sweetcorn", 60, "g", "drained and blitzed or chopped"),
      ing("creme fraiche", 2, "tbsp"),
      ing("chives", null, "pinch", "snipped small", true),
    ],
    method: [
      "Microwave the cubed potato in a covered bowl with a splash of water for 8–9 minutes, until it gives completely under a fork.",
      "Drain, and mash smooth while it is still hot.",
      "Flake the mackerel through it, checking as you go that nothing firm is left.",
      "Chop or blitz the sweetcorn — whole kernels are a choking risk — and fold it in with the crème fraîche and chives.",
    ],
    tips: [
      "Tinned mackerel in spring water or oil only. Anything in brine or a sauce is far too salty.",
      "Oily fish is capped at two portions a week, so pair this with a white fish or meat meal rather than another oily one.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true,
    vegetarian: false, glutenFree: true,
  }),

  recipe({
    id: "quick-beef-tomato-pasta",
    title: "Fifteen-Minute Beef and Tomato Pasta",
    source: "extra",
    blurb: "The iron workhorse. Grating the carrot rather than dicing it means it disappears into the sauce in the time the pasta takes.",
    slots: ["lunch"], ageBandMonths: 7,
    babyPortions: 4, feedsAdultToo: true,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 15, longRecipe: false, noCook: false,
    ingredients: [
      ing("olive oil", 1, "tbsp"),
      ing("beef mince", 250, "g", "5% fat"),
      ing("carrot", 1, "piece", "coarsely grated"),
      ing("passata", 250, "g"),
      ing("dried oregano", 0.5, "tsp"),
      ing("pasta shapes", 120, "g", "small shapes"),
    ],
    method: [
      "Put the pasta on to boil, and cook it a couple of minutes past the packet time so it is properly soft.",
      "Meanwhile, brown the mince in the oil over a high heat, breaking up every lump as it goes.",
      "Add the grated carrot and cook for two minutes, then pour in the passata and the oregano.",
      "Simmer hard for 6–7 minutes, until the sauce has thickened and the meat is cooked through with no pink left.",
      "Stir the drained pasta through, and chop or blitz briefly if the texture is still too coarse.",
    ],
    tips: [
      "Red meat is the single best iron source available in a legume-free plan — worth landing twice a week.",
      "Take the adults’ share out before serving; season yours at the table, not in the pan.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true,
    vegetarian: false, glutenFree: false,
  }),

  recipe({
    id: "quick-chicken-courgette-couscous",
    title: "Chicken, Courgette and Lemon Couscous",
    source: "extra",
    blurb: "Couscous only needs boiling water and five minutes under a lid, which leaves the whole fifteen minutes for the chicken.",
    slots: ["lunch"], ageBandMonths: 7,
    babyPortions: 3, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 15, longRecipe: false, noCook: false,
    ingredients: [
      ing("couscous", 80, "g"),
      ing("chicken stock", 120, "ml", "hot, homemade or low-sodium"),
      ing("olive oil", 1, "tbsp"),
      ing("chicken breast", 150, "g", "diced small"),
      ing("courgette", 1, "piece", "coarsely grated"),
      ing("lemon", 0.25, "piece", "zest and juice"),
      ing("parsley", null, "pinch", "chopped", true),
    ],
    method: [
      "Pour the hot stock over the couscous, cover, and leave it alone for five minutes, then fork it through.",
      "While it steams, fry the diced chicken in the oil over a medium-high heat for 6–7 minutes, until cooked right through with no pink at the centre.",
      "Add the grated courgette for the last two minutes, just until it softens.",
      "Fork everything together with the lemon zest, juice and parsley, and mash or chop to the texture you need.",
    ],
    tips: [
      "Homemade or low-sodium stock only — shop-bought stock is salty, and often contains celery.",
      "Dice the chicken small and check it before serving: firm pieces of meat are a choking hazard.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: false,
    vegetarian: false, glutenFree: false,
  }),

  recipe({
    id: "quick-spinach-ricotta-pasta",
    title: "Spinach and Ricotta Pasta Stir-Through",
    source: "extra",
    blurb: "A sauce made in the pasta pan with no cooking of its own — the heat of the drained pasta melts the ricotta into it.",
    slots: ["lunch"], ageBandMonths: 7,
    babyPortions: 3, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 12, longRecipe: false, noCook: false,
    ingredients: [
      ing("pasta shapes", 120, "g", "small shapes"),
      ing("spinach", 80, "g", "washed"),
      ing("ricotta", 100, "g"),
      ing("parmesan", 15, "g", "finely grated"),
      ing("nutmeg", null, "pinch", "grated"),
      ing("olive oil", 1, "tsp"),
    ],
    method: [
      "Boil the pasta a couple of minutes past the packet time, so it is soft enough to squash between your fingers.",
      "Throw the spinach into the pan for the last thirty seconds, then drain both together, keeping a little of the water.",
      "Chop the wilted spinach finely — whole leaves wrap round a baby’s tongue.",
      "Return everything to the warm pan off the heat, stir in the ricotta, parmesan, nutmeg and oil, and loosen with the reserved water.",
    ],
    tips: [
      "Parmesan and ricotta together make this one of the saltier meals here, so it is never planned twice in a day.",
      "Use a vegetarian hard cheese in place of parmesan if that matters to you.",
    ],
    legumeStatus: "safe", saltAware: true, ironRich: true,
    vegetarian: true, glutenFree: false,
  }),

  recipe({
    id: "quick-egg-rice-carrot-sweetcorn",
    title: "Egg, Carrot and Sweetcorn Rice",
    source: "extra",
    blurb: "Built on rice cooked the day before, which is the whole reason it takes ten minutes. Egg carries the iron and the rice carries the egg.",
    slots: ["lunch"], ageBandMonths: 7,
    babyPortions: 2, feedsAdultToo: false,
    freezable: "no", freezeFormat: "none", fridgeDays: 1,
    activeMinutes: 10, longRecipe: false, noCook: false,
    usesLeftover: "cooked white rice",
    ingredients: [
      ing("rapeseed oil", 1, "tbsp"),
      ing("carrot", 1, "piece", "finely grated"),
      ing("sweetcorn", 60, "g", "drained and chopped"),
      ing("white rice", 150, "g", "cooked, cooled fast and kept in the fridge"),
      ing("egg", 1, "piece", "beaten"),
      ing("spring onion", 1, "piece", "finely sliced", true),
    ],
    method: [
      "Heat the oil in a wide pan and cook the grated carrot for two minutes until it softens.",
      "Add the chopped sweetcorn and the cold rice, and stir-fry for three minutes until everything is steaming hot.",
      "Push it to one side, pour the beaten egg into the space, and scramble it until firm with no liquid left.",
      "Fold the two together, cook for one more minute, and cool before serving.",
    ],
    tips: [
      "Cooked rice must be cooled within an hour, refrigerated, used within a day and reheated once only. Never reheat it twice, and never freeze this dish.",
      "Chop the sweetcorn — whole kernels are a choking hazard at this age.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true,
    vegetarian: true, glutenFree: true,
  }),
];
