"use client";

import { useState } from "react";
import type { MealSlot, PlannedMeal, Plan } from "@/lib/types";
import { getRecipe } from "@/lib/data/recipes";
import { swapOptions } from "@/lib/planner/generate";
import { AllergenBadges, Badge, StateLine } from "./ui";
import { Star } from "./icons";
import { RecipeDetail } from "./RecipeDetail";
import { usePlan } from "./PlanProvider";

export function MealCard({
  meal, plan, allergensSeen, onSwap, onToggleLock, showSlot = false, showRuleOut = false,
  bare = false,
}: {
  meal: PlannedMeal;
  plan: Plan;
  allergensSeen: Set<string>;
  onSwap: (dayIndex: number, slot: MealSlot, recipeId: string) => void;
  onToggleLock: (dayIndex: number, slot: MealSlot) => void;
  /** Only worth showing when more than one meal a day is planned. */
  showSlot?: boolean;
  /**
   * Offer "not again". Shown where a refusal actually happens — the Today
   * screen — rather than on all fourteen cards of a plan you are still making.
   */
  showRuleOut?: boolean;
  /** Drop the card chrome, for when the caller supplies its own. */
  bare?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const { saved, notes, blocked, toggleBlocked } = usePlan();
  const recipe = getRecipe(meal.recipeId);
  const note = notes[recipe.id];

  return (
    <div className={bare ? "p-3" : "rounded-lg border border-sage-tint bg-white p-3"}>
      {showSlot && (
        <p className="mb-1 text-xs font-medium text-ink-muted">
          {meal.slot === "lunch" ? "Lunch" : "Breakfast"}
        </p>
      )}

      <div className="flex items-start justify-between gap-2">
        {/* A heading, so the meals of a day can be navigated as a list. */}
        <h3 className="-my-1 min-w-0 flex-1">
          <button
            onClick={() => setOpen(true)}
            className="min-h-[2.75rem] w-full py-1 text-left text-[15px] font-semibold leading-snug text-ink"
            aria-haspopup="dialog"
          >
            {recipe.title}
          </button>
        </h3>
        {meal.locked && <Badge tone="blush">Locked</Badge>}
      </div>

      <div className="mt-1.5">
        <StateLine
          state={meal.state}
          cubes={meal.cubesToDefrost}
          portions={meal.portionsToDefrost}
        />
      </div>

      <div className="mt-2">
        <AllergenBadges allergens={recipe.allergens} seen={allergensSeen} showNew />
      </div>

      {/* What you learned last time this was served, at the moment you serve it. */}
      {note && (
        <p className="mt-2 rounded-lg bg-sage-tint px-3 py-2 text-xs text-ink">
          <span className="font-medium">Your note: </span>
          {note}
        </p>
      )}

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

      {/*
        The mirror of saving, and the one that saves the most time: a recipe
        they refused should never be offered again, not swapped away every week.
      */}
      {showRuleOut && (
        <button
          onClick={() => toggleBlocked(recipe.id)}
          aria-pressed={blocked.has(recipe.id)}
          className={`mt-1.5 min-h-[2.75rem] w-full text-left text-xs font-medium underline underline-offset-2 ${
            blocked.has(recipe.id) ? "text-alert" : "text-ink-muted hover:text-ink"
          }`}
        >
          {blocked.has(recipe.id)
            ? "Ruled out — put it back"
            : "Not again — never plan this one"}
        </button>
      )}

      {swapping && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg bg-cream p-1">
          <p className="px-2 py-1.5 text-xs text-ink-muted">
            {saved.size > 0
              ? "Your saved recipes first, then everything else that keeps well enough for this day."
              : "Legume-free options that keep well enough for this day."}
          </p>
          {swapOptions(plan, meal.dayIndex, meal.slot, saved, blocked)
            .filter((r) => r.id !== meal.recipeId)
            .map((r) => (
              <button
                key={r.id}
                onClick={() => { onSwap(meal.dayIndex, meal.slot, r.id); setSwapping(false); }}
                className="block w-full rounded px-2 py-2 text-left hover:bg-sage-tint active:bg-sage"
              >
                <span className="flex min-h-[2.75rem] items-center gap-1.5 text-sm text-ink">
                  {saved.has(r.id) && <Star filled />}
                  {r.title}
                  {saved.has(r.id) && <span className="sr-only">(saved)</span>}
                </span>
                {/* What you learned last time, at the moment you are choosing. */}
                {notes[r.id] && (
                  <span className="block pb-1 text-xs text-ink-muted">{notes[r.id]}</span>
                )}
              </button>
            ))}
        </div>
      )}

      {open && <RecipeDetail recipe={recipe} onClose={() => setOpen(false)} allergensSeen={allergensSeen} />}
    </div>
  );
}
