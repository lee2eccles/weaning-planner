"use client";

import { usePlan } from "./PlanProvider";
import { Button, Chip, Segmented, Stepper } from "./ui";
import {
  MAX_EATERS, MIN_EATERS, clampCoverage, convertCoverage, coverageBounds,
  daysLabel, planDays, portionsPerDay, portionsPlanned, portionsOvershoot,
} from "@/lib/planner/coverage";
import { MAX_DAYS_PER_PREP_SESSION } from "@/lib/planner/constraints";
import type { CoverageMode, MealSlot } from "@/lib/types";

const MODES: { value: CoverageMode; label: string }[] = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "portions", label: "Portions" },
];

const SLOT_BLURB: Record<MealSlot, string> = {
  breakfast: "Adds the breakfast library, and roughly doubles the shopping.",
  lunch: "The main meal of the day at this age.",
};

/**
 * The one place a plan's size is decided.
 *
 * People arrive at the same question from different directions — "the next
 * fortnight", "the ten days before we travel", "the forty portions of freezer
 * space I have" — so all three are first-class ways of asking, and the card
 * shows the other two back as you go. Every change is saved immediately;
 * `onSubmit` is only for the case where there is no plan yet to be made stale.
 */
export function PlanSetup({
  onSubmit, submitLabel = "Make the plan", busy = false,
}: {
  onSubmit?: () => void;
  submitLabel?: string;
  busy?: boolean;
}) {
  const { settings, updateSettings } = usePlan();
  const { coverage } = settings;

  const days = planDays(settings);
  const perDay = portionsPerDay(settings);
  const bounds = coverageBounds(settings, coverage.mode);
  const overshoot = portionsOvershoot(settings);
  const sessions = Math.ceil(days / MAX_DAYS_PER_PREP_SESSION);

  const presets =
    coverage.mode === "weeks"
      ? [1, 2, 3, 4]
      : coverage.mode === "days"
        ? [3, 5, 7, 10, 14]
        : [7, 14, 21, 28].map((d) => d * perDay);

  function setValue(value: number) {
    updateSettings({ coverage: clampCoverage({ mode: coverage.mode, value }, settings) });
  }

  function setMode(mode: CoverageMode) {
    updateSettings({ coverage: clampCoverage(convertCoverage(settings, mode), settings) });
  }

  function setEaters(eaters: number) {
    const next = { ...settings, eaters };
    updateSettings({ eaters, coverage: clampCoverage(settings.coverage, next) });
  }

  function toggleSlot(slot: MealSlot) {
    const on = settings.slots.includes(slot);
    const next = on ? settings.slots.filter((s) => s !== slot) : [...settings.slots, slot];
    // Planning nothing is not a useful state.
    if (next.length === 0) return;
    const slots = (["breakfast", "lunch"] as MealSlot[]).filter((s) => next.includes(s));
    updateSettings({ slots, coverage: clampCoverage(settings.coverage, { ...settings, slots }) });
  }

  return (
    <div className="rounded-xl border border-sage-tint bg-white p-5">
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-ink">How much food do you need?</p>
          <Segmented label="Set the plan by" value={coverage.mode} options={MODES} onChange={setMode} />
          <p className="mt-2 text-xs text-ink-muted">
            {coverage.mode === "portions"
              ? "Useful when the freezer, not the calendar, is what is deciding."
              : "Set it in whatever unit you are already thinking in — they all reach the same plan."}
          </p>
        </div>

        <Stepper
          label={
            coverage.mode === "weeks" ? "Weeks" : coverage.mode === "days" ? "Days" : "Baby portions"
          }
          value={coverage.value}
          min={bounds.min}
          max={bounds.max}
          step={coverage.mode === "portions" ? bounds.step : 1}
          onChange={setValue}
        />

        <div className="flex flex-wrap gap-2">
          {presets.map((n) => (
            <Chip key={n} pressed={coverage.value === n} onClick={() => setValue(n)}>
              {coverage.mode === "portions" ? `${n} portions` : n}
              {coverage.mode === "weeks" ? (n === 1 ? " week" : " weeks") : ""}
              {coverage.mode === "days" ? (n === 1 ? " day" : " days") : ""}
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
          onChange={setEaters}
          hint="One portion each, every meal."
        />

        {/* The summary is the point of the card: it says what you just asked for. */}
        <div className="rounded-lg bg-sage-tint px-4 py-3">
          <p className="text-sm font-medium text-ink">
            {daysLabel(days)} · {settings.slots.join(" and ")} · {portionsPlanned(settings)} baby
            portions
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {sessions === 1
              ? "One prep session and one big shop"
              : `${sessions} prep sessions, a fortnight apart, with a shop before each`}
            {days > 7
              ? ", plus a small top-up later if any meal is made fresh rather than batched."
              : "."}
          </p>
          {overshoot > 0 && (
            <p className="mt-1 text-sm text-ink-muted">
              Rounded up to whole days, so {overshoot} portion{overshoot === 1 ? "" : "s"} more than
              you asked for.
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
