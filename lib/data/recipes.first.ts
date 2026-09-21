import type { Recipe } from "@/lib/types";
import { ing } from "./ingredients";
import { recipe } from "./build";

/**
 * Lunches from six months — the first savoury meals.
 *
 * The library used to start its lunches at seven months, which left the 6+
 * band with four recipes and every one of them a breakfast. Choosing that band
 * in Settings therefore produced a plan with no meals in it at all.
 *
 * Six months is the start of solids, not a smaller version of nine months: one
 * or two teaspoons at a sitting, smooth or soft-mashed, no added salt, and the
 * meat and fish carrying the iron, because the usual first-food answers —
 * lentils, split peas, hummus — are all legumes and excluded here.
 *
 * Each one gives its texture as a range rather than a single instruction, and
 * carries `firstFood` so it says what it is on the card where Swap sits. The
 * age band is a floor and not a ceiling: these stay in the pool at nine and
 * twelve months, where the same food wants to be lumpier and served in strips
 * rather than off a spoon, and where a parent may well swap one out.
 *
 * The set leads with the non-sweet vegetables — broccoli, cauliflower, spinach
 * — that NHS guidance names for first tastes. Sweet potato and carrot are the
 * easy sell and every weaning book opens with them, which is the reason not
 * to: a baby will take the sweet ones whenever they meet them, and the window
 * for learning to like the bitter ones is now.
 */
export const FIRST_LUNCHES: Recipe[] = [
  recipe({
    id: "first-broccoli-cauliflower",
    title: "Broccoli and Cauliflower First Purée",
    source: "extra",
    blurb: "The one to start on — and deliberately not a sweet one. A baby will take sweet food whenever they first meet it; this is the taste worth spending the early weeks on.",
    slots: ["lunch"], ageBandMonths: 6, firstFood: true,
    babyPortions: 4, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 15, longRecipe: false, noCook: false,
    ingredients: [
      ing("broccoli", 200, "g", "broken into small florets"),
      ing("cauliflower", 200, "g", "broken into small florets"),
      ing("unsalted butter", 1, "tsp"),
      ing("water", 100, "ml", "or more, to loosen"),
    ],
    method: [
      "Steam the broccoli and cauliflower together for 12 minutes, until both crush against the side of the pan with no resistance.",
      "Blend with the butter and half the water, adding the rest a splash at a time.",
      "For a baby on their first spoonfuls, take it completely smooth and loose enough to fall slowly off a spoon. Once they are managing that, fork-mash it instead and leave it rough.",
      "Cool completely before it goes near the freezer.",
    ],
    tips: [
      "Starting on the bitter vegetables rather than the sweet ones is the single easiest thing to do now and the hardest to go back and fix later.",
      "A first portion is a teaspoon or two. Two cubes is already more than most babies take at the start.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: false, vegetarian: true, glutenFree: true,
  }),

  recipe({
    id: "first-spinach-potato",
    title: "Spinach and Potato First Purée",
    source: "extra",
    blurb: "Green, mild and a little earthy. Potato softens spinach without turning it into something sweet.",
    slots: ["lunch"], ageBandMonths: 6, firstFood: true,
    babyPortions: 4, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 15, longRecipe: false, noCook: false,
    ingredients: [
      ing("potato", 250, "g", "peeled and diced"),
      ing("spinach", 100, "g"),
      ing("whole milk", 3, "tbsp"),
      ing("unsalted butter", 1, "tsp"),
    ],
    method: [
      "Boil or steam the potato for 12 minutes, until it falls apart against a fork.",
      "Add the spinach for the last minute, just long enough to wilt right down.",
      "Blend or mash with the milk and butter, to whichever texture they are on.",
    ],
    tips: [
      "Spinach carries iron, though not the kind that absorbs as readily as the iron in meat — which is why the meat dishes here matter more than they would in most weaning plans.",
      "Made with milk, so it is one to cook rather than to serve straight from a first-foods pouch.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true, vegetarian: true, glutenFree: true,
  }),

  recipe({
    id: "first-sweet-potato-carrot",
    title: "Sweet Potato and Carrot Purée",
    source: "extra",
    blurb: "The easy one, and worth holding back a week or two so the greens go first. Freezes into cubes that thaw in minutes.",
    slots: ["lunch"], ageBandMonths: 6, firstFood: true,
    babyPortions: 4, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 15, longRecipe: false, noCook: false,
    ingredients: [
      ing("sweet potato", 250, "g", "peeled and cubed"),
      ing("carrot", 150, "g", "peeled and sliced thin"),
      ing("unsalted butter", 1, "tsp"),
      ing("water", 100, "ml", "or more, to loosen"),
    ],
    method: [
      "Steam the sweet potato and carrot together for 12–15 minutes, until a knife goes through with no resistance at all.",
      "Tip into a blender with the butter and half the water. Blend, adding the rest of the water a splash at a time.",
      "Smooth and loose for a baby just starting; fork-mashed and rough once they are used to texture.",
      "Cool completely before it goes near the freezer.",
    ],
    tips: [
      "Steaming rather than boiling keeps the sweetness in the vegetables instead of leaving it in the water.",
      "Two cubes is about one first portion, and most babies start on less than that.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: false, vegetarian: true, glutenFree: true,
  }),

  recipe({
    id: "first-chicken-sweet-potato-apple",
    title: "Chicken, Sweet Potato and Apple",
    source: "extra",
    blurb: "The first meat, made easy to accept — apple takes the edge off chicken for a baby who has only had vegetables.",
    slots: ["lunch"], ageBandMonths: 6, firstFood: true,
    babyPortions: 4, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 25, longRecipe: false, noCook: false,
    ingredients: [
      ing("chicken breast", 150, "g", "diced small"),
      ing("sweet potato", 200, "g", "peeled and cubed"),
      ing("apple", 1, "piece", "peeled, cored and chopped"),
      ing("olive oil", 1, "tsp"),
      ing("water", 150, "ml"),
    ],
    method: [
      "Warm the oil in a small pan and cook the chicken for 4–5 minutes, turning, until no pink remains anywhere.",
      "Add the sweet potato, apple and water. Cover and simmer gently for 15 minutes, until everything collapses under a spoon.",
      "Blend smooth for a first taste of meat, or fork-mash and shred the chicken finely once they are chewing.",
      "Check the temperature on the inside of your wrist before serving — purée holds heat longer than it looks.",
    ],
    tips: [
      "Iron is the reason meat comes in early, and it matters more here than in most weaning plans, where the usual first-food sources are the ones this library leaves out.",
      "The apple is not for sweetness alone — the acidity helps iron absorb.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true, vegetarian: false, glutenFree: true,
  }),

  recipe({
    id: "first-beef-butternut-cinnamon",
    title: "Beef, Butternut and Cinnamon",
    source: "extra",
    blurb: "The most iron in the six-month library, and mild enough that it does not taste like a grown-up's dinner.",
    slots: ["lunch"], ageBandMonths: 6, firstFood: true,
    babyPortions: 4, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 30, longRecipe: false, noCook: false,
    ingredients: [
      ing("beef mince", 150, "g", "lean"),
      ing("butternut squash", 250, "g", "peeled and cubed"),
      ing("onion", 50, "g", "finely chopped"),
      ing("ground cinnamon", null, "pinch"),
      ing("olive oil", 1, "tsp"),
      ing("water", 200, "ml"),
    ],
    method: [
      "Soften the onion in the oil over a low heat for 5 minutes, without letting it colour.",
      "Turn the heat up, add the mince and break it apart as it browns, 5 minutes.",
      "Add the butternut, cinnamon and water. Cover and simmer for 20 minutes, until the squash falls apart and the mince is completely tender.",
      "Blend smooth, or mash and leave the mince in soft crumbs for a baby who has started chewing.",
    ],
    tips: [
      "Mince is the easiest form of red meat to get into a baby this age — there is nothing to chew through.",
      "A pinch of cinnamon is seasoning without salt, which is the whole trick at six months.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: true, vegetarian: false, glutenFree: true,
  }),

  recipe({
    id: "first-salmon-potato-courgette",
    title: "Salmon, Potato and Courgette Mash",
    source: "extra",
    blurb: "Oily fish early and often. Salmon flakes into potato without a single lump to chew.",
    slots: ["lunch"], ageBandMonths: 6, firstFood: true,
    babyPortions: 3, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 1,
    activeMinutes: 20, longRecipe: false, noCook: false,
    ingredients: [
      ing("salmon", 120, "g", "skinless and boneless"),
      ing("potato", 200, "g", "peeled and diced"),
      ing("courgette", 100, "g", "diced"),
      ing("whole milk", 3, "tbsp"),
      ing("unsalted butter", 1, "tsp"),
    ],
    method: [
      "Boil or steam the potato for 12 minutes, adding the courgette for the last 5.",
      "Sit the salmon on top for those last 5 minutes with a lid on, until it flakes at a touch and is opaque all the way through.",
      "Mash everything with the milk and butter. Blend it smooth if they are new to solids.",
      "Run a finger through the fish first, then again after mashing. A small bone is easy to miss twice.",
    ],
    tips: [
      "Oily fish is recommended about once a week from six months, and salmon is the mildest way in.",
      "This one keeps a day in the fridge rather than two — fish is less forgiving than vegetables.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: false, vegetarian: false, glutenFree: true,
  }),

  recipe({
    id: "first-butternut-cauliflower-cheese",
    title: "Butternut and Cauliflower Cheese",
    source: "extra",
    blurb: "A first taste of cheese, kept to the small amount that suits a baby, in the vegetable that carries it best.",
    slots: ["lunch"], ageBandMonths: 6, firstFood: true,
    babyPortions: 4, feedsAdultToo: false,
    freezable: "yes", freezeFormat: "cube", fridgeDays: 2,
    activeMinutes: 20, longRecipe: false, noCook: false,
    ingredients: [
      ing("butternut squash", 250, "g", "peeled and cubed"),
      ing("cauliflower", 200, "g", "broken into small florets"),
      ing("cheddar", 25, "g", "mild, finely grated"),
      ing("whole milk", 3, "tbsp"),
    ],
    method: [
      "Steam the butternut and cauliflower together for 15 minutes, until both crush easily against the side of the pan.",
      "Blend or mash with the milk to the texture they are on.",
      "Stir the grated cheddar through while it is still hot, so it melts in rather than sitting in threads.",
    ],
    tips: [
      "Cheese is salty, so the amount here is deliberately small — a whole baby portion carries only a few grams.",
      "Full-fat cheese, always. Babies need the fat, and the reduced-fat versions are saltier for it.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: false, vegetarian: true, glutenFree: true,
  }),

  recipe({
    id: "first-veg-sticks-avocado",
    title: "Soft Vegetable Sticks with Avocado",
    source: "extra",
    blurb: "The hands-on end of six months: something to hold, something to dip it in, and nothing to cook ahead.",
    slots: ["lunch"], ageBandMonths: 6, firstFood: true,
    babyPortions: 2, feedsAdultToo: false,
    freezable: "no", freezeFormat: "none", fridgeDays: 1,
    activeMinutes: 12, longRecipe: false, noCook: false,
    ingredients: [
      ing("carrot", 1, "piece", "large, cut into finger-length sticks"),
      ing("tenderstem broccoli", 100, "g"),
      ing("avocado", 1, "piece", "ripe"),
      ing("olive oil", 1, "tsp"),
    ],
    method: [
      "Steam the carrot sticks for 10 minutes and the broccoli for the last 5, until a stick bends without snapping. Too firm and it is a choking risk; too soft and it falls apart in their fist.",
      "Cut each piece to roughly the length of your little finger, so a fist can hold it with some sticking out at the top.",
      "Mash the avocado with the oil and put it in a shallow dish for dipping, or spread it along the sticks so it comes with them.",
      "Sit with them the whole time, and keep them upright rather than reclined.",
    ],
    tips: [
      "Made fresh rather than frozen — steamed sticks go limp in the freezer and avocado browns.",
      "Gagging is loud and normal and not the same as choking, which is silent. It is worth knowing the difference before the first go.",
    ],
    legumeStatus: "safe", saltAware: false, ironRich: false, vegetarian: true, glutenFree: true,
  }),
];
