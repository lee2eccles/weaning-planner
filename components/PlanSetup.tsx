"use client";

import { usePlan } from "./PlanProvider";
import { Button, Chip, Stepper } from "./ui";
import {
  MAX_EATERS, MIN_EATERS, MIN_MEALS, clampMeals, daysLabel, maxMeals, mealWord,
  mealsOvershoot, mealsPlanned, planDays, portionsPlanned,
} from "@/lib/planner/coverage";
import { MAX_DAYS_PER_PREP_SESSION } from "@/lib/planner/constraints";
import type { MealSlot } from "@/lib/types";

const SLOT_BLURB: Record<MealSlot, string> = {
  breakfast: "Adds the breakfast library, and roughly doubles the shopping.",
  lunch: "The main meal of the day at this age.",
};

/**
 * The one place a plan's size is decided.
 *
 * It asks one question — how many meals — because that is the whole question:
 * "I only need four lunches this week" is a complete brief. It used to offer
 * days, weeks and portions as three ways of saying the same thing, which was
 * eleven controls for one number and a summary that answered in the unit you
 * had just left.
 */
export function PlanSetup({
  onSubmit, submitLabel = "Make the plan", busy = false,
}: {
  onSubmit?: () => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const { settings, updateSettings } = usePlan();

  const meals = clampMeals(settings.meals, settings);
  const days = planDays(settings);
  const overshoot = mealsOvershoot(settings);
  const sessions = Math.ceil(days / MAX_DAYS_PER_PREP_SESSION);
  const word = mealWord(settings, meals);

  const presets = [4, 7, 14, 28].filter((n) => n <= maxMeals(settings));

  function setMeals(value: number) {
    updateSettings({ meals: clampMeals(value, settings) });
  }

  function toggleSlot(slot: MealSlot) {
    const on = settings.slots.includes(slot);
    const next = on ? settings.slots.filter((s) => s !== slot) : [...settings.slots, slot];
    // Planning nothing is not a useful state.
    if (next.length === 0) return;
    const slots = (["breakfast", "lunch"] as MealSlot[]).filter((s) => next.includes(s));
    updateSettings({ slots, meals: clampMeals(settings.meals, { slots }) });
  }

  return (
    <div className="rounded-xl border border-sage-tint bg-white p-5">
      <div className="space-y-5">
        <Stepper
          label={`How many ${mealWord(settings, 2)} do you need?`}
          value={meals}
          min={MIN_MEALS}
          max={maxMeals(settings)}
          onChange={setMeals}
          hint={`One ${mealWord(settings, 1)} feeds everyone eating — ${settings.eaters} portion${
            settings.eaters === 1 ? "" : "s"
          } of food each time.`}
        />

        <div className="flex flex-wrap gap-2">
          {presets.map((n) => (
            <Chip key={n} pressed={meals === n} onClick={() => setMeals(n)}>
              {n} {mealWord(settings, n)}
            </Chip>
          ))}
        </div>

        <fieldset className="border-0 p-0">
          <legend className="mb-2 text-sm font-medium text-ink">Which meals to plan</legend>
          <div className="space-y-1">
            {(["breakfast", "lunch"] as MealSlot[]).map((slot) => {
              const on = settings.slots.includes(slot);
              const last = on && settings.slots.length === 1;
              return (
                <label key={slot} className="flex min-h-[2.75rem] cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={last}
                    onChange={() => toggleSlot(slot)}
                    className="mt-1 h-6 w-6 shrink-0 accent-blush-deep disabled:opacity-60"
                  />
                  <span>
                    <span className="font-medium capitalize text-ink">{slot}</span>
                    <span className="block text-sm text-ink-muted">
                      {last ? "At least one meal has to stay selected." : SLOT_BLURB[slot]}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <Stepper
          label="Babies eating"
          value={settings.eaters}
          min={MIN_EATERS}
          max={MAX_EATERS}
          onChange={(eaters) => updateSettings({ eaters })}
          hint="One portion each, every meal."
        />

        {/* The summary is the point of the card: it says what you just asked for. */}
        <div className="rounded-lg bg-sage-tint px-4 py-3">
          <p className="text-sm font-medium text-ink">
            {mealsPlanned(settings)} {word} · {portionsPlanned(settings)} baby portions ·{" "}
            {daysLabel(days)} of food
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {sessions === 1
              ? "One prep day and one shop"
              : `${sessions} prep days, a fortnight apart, with a shop before each`}
            {days > 7 ? ", plus a small top-up later if any meal is made fresh." : "."}
          </p>
          {overshoot > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              Rounded up to whole days, so {overshoot} {mealWord(settings, overshoot)} more than you
              asked for.
            </p>
          )}
        </div>

        {onSubmit && (
          <Button onClick={onSubmit} disabled={busy} busy={busy} className="w-full sm:w-auto">
            {busy ? "Working…" : submitLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
