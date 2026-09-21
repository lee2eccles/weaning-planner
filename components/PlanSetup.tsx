"use client";

import { useId } from "react";
import { usePlan } from "./PlanProvider";
import { Button, Chip, Stepper } from "./ui";
import {
  MAX_EATERS, MIN_EATERS, clampMeals, daysLabel, maxMeals, mealPresets, mealStep, mealWord,
  mealsOvershoot, mealsPlanned, planDays, portionsPlanned, slotsPerDay,
} from "@/lib/planner/coverage";
import { MAX_DAYS_PER_PREP_SESSION } from "@/lib/planner/constraints";
import type { MealSlot } from "@/lib/types";

const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
};

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
 *
 * Which meals to plan comes first because it decides the unit of everything
 * below it. Asking for the number first meant ticking breakfast relabelled a
 * question that had already been answered, and doubled the answer with it.
 */
export function PlanSetup({
  onSubmit, submitLabel = "Make the plan", busy = false,
}: {
  onSubmit?: () => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const { settings, updateSettings } = usePlan();
  const presetsLabelId = useId();

  const meals = clampMeals(settings.meals, settings);
  const days = planDays(settings);
  const overshoot = mealsOvershoot(settings);
  const sessions = Math.ceil(days / MAX_DAYS_PER_PREP_SESSION);
  const word = mealWord(settings, mealsPlanned(settings));

  const presets = mealPresets(settings);

  function setMeals(value: number) {
    updateSettings({ meals: clampMeals(value, settings) });
  }

  function toggleSlot(slot: MealSlot) {
    const on = settings.slots.includes(slot);
    const next = on ? settings.slots.filter((s) => s !== slot) : [...settings.slots, slot];
    // Planning nothing is not a useful state.
    if (next.length === 0) return;
    const slots = (["breakfast", "lunch"] as MealSlot[]).filter((s) => next.includes(s));
    // Keep the number of DAYS, not the number of meals: someone who asked for
    // four lunches and then adds breakfast wants four of each, not two days.
    const days = planDays(settings);
    updateSettings({ slots, meals: clampMeals(days * slots.length, { slots }) });
  }

  return (
    <div className="rounded-xl border border-sage-tint bg-white p-5">
      <div className="space-y-5">
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
                    <span className="font-medium text-ink">{SLOT_LABEL[slot]}</span>
                    {/* The full stop is what separates the two in a screen
                        reader, which hears one run-on string otherwise. */}
                    {/* The constraint is added to the description rather than
                        swapped for it: this is the first thing on the card, and
                        explaining why the box is greyed out is no reason to
                        stop saying what the meal is. */}
                    <span className="block text-sm text-ink-muted">
                      {". "}
                      {SLOT_BLURB[slot]}
                      {last && " Kept selected because a plan needs at least one meal."}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <Stepper
            label={`How many ${mealWord(settings, 2)} do you need?`}
            value={meals}
            min={slotsPerDay(settings)}
            max={maxMeals(settings)}
            step={mealStep(settings)}
            onChange={setMeals}
            hint={`One ${mealWord(settings, 1)} feeds everyone eating — ${settings.eaters} portion${
              settings.eaters === 1 ? "" : "s"
            } of food each time.`}
          />

          {/* Shortcuts, not a second copy of the question. Without the line
              above them, asking for a number they do not contain left four
              unpressed buttons sitting there like something you had skipped. */}
          <p id={presetsLabelId} className="mb-2 mt-4 text-sm text-ink-muted">
            Or start from a common size
          </p>
          {/* Even columns on a phone: with the span spelled out, four
              free-flowing chips broke into three ragged rows. Columns are
              fitted rather than fixed at two, so at 200% zoom they fall to
              one instead of squeezing the text out of the pill. */}
          <div
            role="group"
            aria-labelledby={presetsLabelId}
            className="grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] gap-2 sm:flex sm:flex-wrap"
          >
            {presets.map((p) => (
              <Chip
                key={p.meals}
                pressed={meals === p.meals}
                onClick={() => setMeals(p.meals)}
                note={daysLabel(p.days)}
              >
                {p.meals} {mealWord(settings, p.meals)}
              </Chip>
            ))}
          </div>
        </div>

        <Stepper
          label="Babies eating"
          value={settings.eaters}
          min={MIN_EATERS}
          max={MAX_EATERS}
          onChange={(eaters) => updateSettings({ eaters })}
          hint="One portion each, every meal."
        />

        {/* The summary is the point of the card: it says what you just asked
            for. It announces itself, so changing the number reads back its
            consequence to a screen reader instead of only redrawing. */}
        <div role="status" aria-live="polite" className="rounded-lg bg-sage-tint px-4 py-3">
          <p className="text-sm font-medium tabular-nums text-ink">
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
