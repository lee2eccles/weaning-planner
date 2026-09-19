"use client";

import { useMemo, useState } from "react";
import { ALL_RECIPES } from "@/lib/data/recipes";
import { RecipeDetail } from "@/components/RecipeDetail";
import { AllergenBadges, Badge, Button, Card, RecipeMeta, SectionHeading } from "@/components/ui";
import { usePlan } from "@/components/PlanProvider";
import { LegumeBar } from "@/components/LegumeBanner";
import { ALLERGEN_LABELS, type Allergen, type Recipe } from "@/lib/types";

type Filter = "all" | "breakfast" | "lunch" | "iron";

export default function RecipesPage() {
  const { allergensSeen, settings } = usePlan();
  const [filter, setFilter] = useState<Filter>("all");
  const [allergen, setAllergen] = useState<Allergen | "any">("any");
  const [open, setOpen] = useState<Recipe | null>(null);

  const allergensPresent = useMemo(() => {
    const s = new Set<Allergen>();
    for (const r of ALL_RECIPES) for (const a of r.allergens) s.add(a);
    return [...s].sort();
  }, []);

  const shown = ALL_RECIPES.filter((r) => {
    if (r.legumeStatus === "contains") return false;
    if (filter === "iron") {
      if (!r.ironRich) return false;
    } else if (filter !== "all") {
      if (!r.slots.includes(filter)) return false;
    }
    // Do not browse recipes the planner would refuse to use.
    if (!r.slots.some((sl) => settings.slots.includes(sl))) return false;
    if (allergen !== "any" && !r.allergens.includes(allergen)) return false;
    return true;
  });

  return (
    <div>
      <LegumeBar />
      <SectionHeading sub={`${shown.length} shown · every recipe here is legume-free by design`}>
        Recipes
      </SectionHeading>

      <div className="no-print mb-3 flex flex-wrap gap-2">
        {(["all", ...settings.slots, "iron"] as Filter[]).map((f) => (
          <Button key={f} variant={filter === f ? "primary" : "ghost"} onClick={() => setFilter(f)}>
            {f === "iron" ? "Good for iron" : f[0].toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <span className="text-sm text-ink-muted">Contains:</span>
        <Button variant={allergen === "any" ? "secondary" : "ghost"} onClick={() => setAllergen("any")}>
          Any
        </Button>
        {allergensPresent.map((a) => (
          <Button key={a} variant={allergen === a ? "secondary" : "ghost"} onClick={() => setAllergen(a)}>
            {ALLERGEN_LABELS[a]}
          </Button>
        ))}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <Card key={r.id}>
            <button onClick={() => setOpen(r)} className="w-full text-left" aria-haspopup="dialog">
              <h3 className="flex min-h-[2.75rem] items-center font-semibold leading-snug text-ink">{r.title}</h3>
            </button>
            <p className="mt-1 text-xs text-ink-muted">
              {r.slots.join(" · ")} · makes {r.babyPortions} baby portion{r.babyPortions === 1 ? "" : "s"}
            </p>
            <div className="mt-2"><RecipeMeta recipe={r} /></div>
            <div className="mt-2">
              <AllergenBadges allergens={r.allergens} seen={allergensSeen} showNew />
            </div>
          </Card>
        ))}
      </div>

      {open && <RecipeDetail recipe={open} onClose={() => setOpen(null)} allergensSeen={allergensSeen} />}
    </div>
  );
}
