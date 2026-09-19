"use client";

import { useState } from "react";
import type { MealSlot, PlannedMeal, Plan } from "@/lib/types";
import { getRecipe } from "@/lib/data/recipes";
import { swapOptions } from "@/lib/planner/generate";
import { AllergenBadges, Badge, StateLine } from "./ui";
import { RecipeDetail } from "./RecipeDetail";

export function MealCard({
  meal, plan, allergensSeen, onSwap, onToggleLock, showSlot = false,
}: {
  meal: PlannedMeal;
  plan: Plan;
  allergensSeen: Set<string>;
  onSwap: (dayIndex: number, slot: MealSlot, recipeId: string) => void;
  onToggleLock: (dayIndex: number, slot: MealSlot) => void;
  /** Only worth showing when more than one meal a day is planned. */
  showSlot?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const recipe = getRecipe(meal.recipeId);

  return (
    <div className="rounded-lg border border-sage-tint bg-white p-3">
      {showSlot && (
        <p className="mb-1 text-xs font-medium capitalize text-ink-muted">{meal.slot}</p>
      )}

      <div className="flex items-start justify-between gap-2">
        <button
          onClick={() => setOpen(true)}
          className="-my-1 min-h-[2.75rem] min-w-0 flex-1 py-1 text-left text-[15px] font-semibold leading-snug text-ink"
          aria-haspopup="dialog"
        >
          {recipe.title}
        </button>
        {meal.locked && <Badge tone="blush">Locked</Badge>}
      </div>

      <div className="mt-1.5">
        <StateLine state={meal.state} cubes={meal.cubesToDefrost} />
      </div>

      <div className="mt-2">
        <AllergenBadges allergens={recipe.allergens} seen={allergensSeen} showNew />
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => setSwapping((s) => !s)}
          aria-expanded={swapping}
          className="min-h-[2.75rem] flex-1 rounded-lg border border-sage px-3 text-sm font-medium text-ink hover:bg-sage-tint active:bg-sage"
        >
          Swap
        </button>
        <button
          onClick={() => onToggleLock(meal.dayIndex, meal.slot)}
          aria-pressed={meal.locked}
          className={`min-h-[2.75rem] flex-1 rounded-lg border px-3 text-sm font-medium text-ink hover:bg-sage-tint active:bg-sage ${
            meal.locked ? "border-blush bg-blush-tint" : "border-sage"
          }`}
        >
          {meal.locked ? "Unlock" : "Lock"}
        </button>
      </div>

      {swapping && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-cream p-1">
          <p className="px-2 py-1.5 text-xs text-ink-muted">
            Legume-free options that keep well enough for this day.
          </p>
          {swapOptions(plan, meal.dayIndex, meal.slot)
            .filter((r) => r.id !== meal.recipeId)
            .map((r) => (
              <button
                key={r.id}
                onClick={() => { onSwap(meal.dayIndex, meal.slot, r.id); setSwapping(false); }}
                className="block min-h-[2.75rem] w-full rounded px-2 py-2 text-left text-sm text-ink hover:bg-sage-tint active:bg-sage"
              >
                {r.title}
              </button>
            ))}
        </div>
      )}

      {open && <RecipeDetail recipe={recipe} onClose={() => setOpen(false)} allergensSeen={allergensSeen} />}
    </div>
  );
}
