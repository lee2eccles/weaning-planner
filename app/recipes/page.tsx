"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ALL_RECIPES, QUICK_MAX_MINUTES } from "@/lib/data/recipes";
import { searchRecipes } from "@/lib/data/search";
import { savedListToText } from "@/lib/text/export";
import { RecipeDetail } from "@/components/RecipeDetail";
import {
  AllergenBadges, Button, Card, Chip, CopyButton, EmptyState, RecipeMeta,
  SaveButton, SearchInput, SectionHeading,
} from "@/components/ui";
import { usePlan } from "@/components/PlanProvider";
import { LegumeBar } from "@/components/LegumeBanner";
import { ALLERGEN_LABELS, type Allergen, type Recipe } from "@/lib/types";

type Filter = "all" | "saved" | "breakfast" | "lunch" | "quick" | "iron" | "noCook";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  saved: "Saved",
  breakfast: "Breakfast",
  lunch: "Lunch",
  quick: `Under ${QUICK_MAX_MINUTES} min`,
  iron: "Good for iron",
  noCook: "No cooking",
};

const FILTERS: Filter[] = ["all", "saved", "breakfast", "lunch", "quick", "iron", "noCook"];

function matchesFilter(r: Recipe, filter: Filter, saved: Set<string>): boolean {
  switch (filter) {
    case "saved": return saved.has(r.id);
    case "breakfast": return r.slots.includes("breakfast");
    case "lunch": return r.slots.includes("lunch");
    case "quick": return r.activeMinutes <= QUICK_MAX_MINUTES;
    case "iron": return r.ironRich;
    case "noCook": return r.noCook;
    default: return true;
  }
}

/**
 * `useSearchParams` client-side renders everything up to the nearest boundary
 * on a prerendered route, so the library sits inside its own.
 */
export default function RecipesPage() {
  return (
    <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
      <RecipeLibrary />
    </Suspense>
  );
}

function asFilter(value: string | null): Filter {
  return FILTERS.includes(value as Filter) ? (value as Filter) : "all";
}

function RecipeLibrary() {
  const { allergensSeen, settings, saved, toggleSaved, notes } = usePlan();
  const params = useSearchParams();
  const [filter, setFilter] = useState<Filter>(() => asFilter(params.get("show")));
  const [allergen, setAllergen] = useState<string>(() => params.get("allergen") ?? "any");
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [open, setOpen] = useState<Recipe | null>(null);

  /**
   * A search worth sharing is a search worth having in the URL — a link to the
   * saved list, or to every iron recipe, survives being sent to the other
   * parent. Written with the history API rather than a router push so that
   * typing does not fill the back stack or re-render the route per keystroke.
   */
  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (filter !== "all") next.set("show", filter);
    if (allergen !== "any") next.set("allergen", allergen);
    const qs = next.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [query, filter, allergen]);

  const allergensPresent = useMemo(() => {
    const s = new Set<Allergen>();
    for (const r of ALL_RECIPES) for (const a of r.allergens) s.add(a);
    return [...s].sort();
  }, []);

  const library = useMemo(() => ALL_RECIPES.filter((r) => r.legumeStatus !== "contains"), []);

  const shown = useMemo(() => {
    const [rule, value] = allergen.split(":");
    const matched = searchRecipes(library, query).filter((r) => {
      if (!matchesFilter(r, filter, saved)) return false;
      if (rule === "with" && !r.allergens.includes(value as Allergen)) return false;
      if (rule === "without" && r.allergens.includes(value as Allergen)) return false;
      return true;
    });
    // The ones you already cook from come first: after a few weeks the saved
    // list is usually the answer, and scrolling past it to find it is silly.
    return matched.sort((a, b) => Number(saved.has(b.id)) - Number(saved.has(a.id)));
  }, [library, query, filter, allergen, saved]);

  const savedRecipes = useMemo(
    () => library.filter((r) => saved.has(r.id)),
    [library, saved]
  );

  // Browsing is not restricted to the meals being planned — the whole point of
  // a searchable library is finding the recipe you half-remember. But a
  // breakfast recipe cannot appear in a lunch-only plan, and saying so here is
  // cheaper than the confusion of it never turning up.
  const hiddenSlot = (["breakfast", "lunch"] as const).filter(
    (s) => !settings.slots.includes(s)
  );

  const filtersActive = filter !== "all" || allergen !== "any" || query !== "";

  function clearFilters() {
    setFilter("all");
    setAllergen("any");
    setQuery("");
  }

  return (
    <div>
      <LegumeBar />
      <SectionHeading sub={`${library.length} recipes, every one legume-free by design`}>
        Recipes
      </SectionHeading>

      <div className="no-print sticky top-0 z-20 -mx-4 mb-4 space-y-3 border-b border-sage-tint bg-cream/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:px-0">
        <SearchInput
          value={query}
          onChange={setQuery}
          label="Search recipes"
          placeholder="mackerel, sweetcorn, quick, iron…"

          describedBy="recipe-count"
        />

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Chip
              key={f}
              pressed={filter === f}
              onClick={() => setFilter(f)}
              count={f === "saved" ? saved.size : undefined}
            >
              {FILTER_LABELS[f]}
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="allergen-filter" className="text-sm text-ink-muted">
            Allergens
          </label>
          <select
            id="allergen-filter"
            value={allergen}
            onChange={(e) => setAllergen(e.target.value)}
            className="min-h-[2.75rem] rounded-lg border border-sage bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="any">Any — show everything</option>
            <optgroup label="Hide recipes containing">
              {allergensPresent.map((a) => (
                <option key={`without:${a}`} value={`without:${a}`}>
                  Without {ALLERGEN_LABELS[a].toLowerCase()}
                </option>
              ))}
            </optgroup>
            <optgroup label="Show only recipes containing">
              {allergensPresent.map((a) => (
                <option key={`with:${a}`} value={`with:${a}`}>
                  Only with {ALLERGEN_LABELS[a].toLowerCase()}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p id="recipe-count" aria-live="polite" className="text-sm text-ink-muted">
          {shown.length} recipe{shown.length === 1 ? "" : "s"}
          {query ? ` matching “${query}”` : ""}
          {filter !== "all" ? ` · ${FILTER_LABELS[filter].toLowerCase()}` : ""}
        </p>
        <div className="no-print flex flex-wrap gap-2">
          {filter === "saved" && savedRecipes.length > 0 && (
            <CopyButton
              text={savedListToText(shown.length > 0 ? shown : savedRecipes, notes)}
              label="Copy saved list to notes"
            />
          )}
          {filtersActive && (
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {filter === "iron" && (
        <div className="mb-4 rounded-xl border border-sage bg-sage-tint px-4 py-3">
          <p className="text-sm text-ink">
            NHS guidance names beans and lentils among the main iron foods for 7–9 months, and those
            are excluded here. Meat, fish, eggs and dark green vegetables have to carry it instead,
            so it is worth landing a few of these each week.
          </p>
        </div>
      )}

      {filter === "saved" && savedRecipes.length > 0 && shown.length === 0 && (
        <EmptyState
          title="Nothing saved matches that"
          body="You have saved recipes, but none of them match what you have typed. Clearing the search looks through the whole saved list again."
          action={<Button onClick={() => setQuery("")}>Clear the search</Button>}
        />
      )}

      {filter === "saved" && savedRecipes.length === 0 && (
        <EmptyState
          title="Nothing saved yet"
          body="Save a recipe from its page and it lands here — the short list you actually cook from, with your own notes against it, and one button to copy the lot into your notes app."
          action={
            <Button variant="ghost" onClick={() => setFilter("all")}>
              Browse all recipes
            </Button>
          }
        />
      )}

      {shown.length === 0 && filter !== "saved" && (
        <EmptyState
          title="No recipes match"
          body="Nothing in the library fits that combination. Clearing the filters brings everything back."
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <Card key={r.id} className="flex flex-col [content-visibility:auto] [contain-intrinsic-size:auto_13rem]">
            <div className="flex items-start justify-between gap-2">
              <h2 className="min-w-0 flex-1">
                <button
                  onClick={() => setOpen(r)}
                  className="min-h-[2.75rem] w-full text-left font-semibold leading-snug text-ink"
                  aria-haspopup="dialog"
                >
                  {r.title}
                </button>
              </h2>
              <SaveButton saved={saved.has(r.id)} onToggle={() => toggleSaved(r.id)} title={r.title} />
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {r.slots.join(" · ")} · makes {r.babyPortions} baby portion{r.babyPortions === 1 ? "" : "s"}
            </p>
            <div className="mt-2"><RecipeMeta recipe={r} /></div>
            <div className="mt-2">
              <AllergenBadges allergens={r.allergens} seen={allergensSeen} showNew />
            </div>
            {notes[r.id] && (
              <p className="mt-2 line-clamp-2 rounded-lg bg-sage-tint px-3 py-2 text-xs text-ink">
                <span className="font-medium">Your note: </span>
                {notes[r.id]}
              </p>
            )}
          </Card>
        ))}
      </div>

      {hiddenSlot.length > 0 && (
        <p className="mt-5 text-xs leading-relaxed text-ink-muted">
          Your plan covers {settings.slots.join(" and ")} only, so{" "}
          {hiddenSlot.join(" and ")} recipes are browsable here but will not be scheduled. Turn them
          on under Plan size in Settings.
        </p>
      )}

      {open && <RecipeDetail recipe={open} onClose={() => setOpen(null)} allergensSeen={allergensSeen} />}
    </div>
  );
}
