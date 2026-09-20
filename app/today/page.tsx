"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePlan } from "@/components/PlanProvider";
import { MealCard } from "@/components/MealCard";
import { Button, SectionHeading, Card, EmptyState, ShareButton } from "@/components/ui";
import { dayToText } from "@/lib/text/export";
import { LegumeBar, StaleBar } from "@/components/LegumeBanner";
import { getRecipe } from "@/lib/data/recipes";
import { ALLERGEN_LABELS } from "@/lib/types";
import { planDays } from "@/lib/planner/coverage";


export default function TodayPage() {
  const {
    plan, ready, swapMeal, toggleLock, allergensSeen, eaten, toggleEaten,
    skipped, toggleSkipped, todayIndex, planFinished, notes,
  } = usePlan();
  const [dayIndex, setDayIndex] = useState<number | null>(null);

  /**
   * Which day is on screen is decided once, when the screen opens, and after
   * that only by the person using it. Ticking a meal off advances "up next" in
   * the plan but never moves the page: the screen does not shift under someone
   * who is still reading it. Every other write to `dayIndex` is a button.
   */
  useEffect(() => {
    if (plan && dayIndex === null) setDayIndex(todayIndex ?? 0);
    // `todayIndex` is deliberately not a dependency: it changes as meals are
    // ticked off, and re-running on it is exactly the auto-advance we refuse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, dayIndex]);

  if (!ready) return <p className="text-ink-muted">Loading…</p>;
  if (!plan) {
    return (
      <EmptyState
        title="Nothing planned yet"
        body="This screen shows just today's meals and what to take out of the freezer tonight — the one page to check when you are in the middle of things."
      />
    );
  }

  // Before the effect lands, show day one rather than following `todayIndex`.
  const day = dayIndex ?? 0;
  const totalDays = planDays(plan.settings);
  const meals = plan.meals.filter((m) => m.dayIndex === day);
  const tomorrow = plan.meals.filter((m) => m.dayIndex === day + 1 && m.state === "defrost");
  const prepSession = plan.prepSessions.find((sn) => sn.dayIndex === day);
  const viewedDayDone =
    meals.length > 0 &&
    meals.every((m) => eaten.has(`${m.dayIndex}:${m.slot}`) || skipped.has(`${m.dayIndex}:${m.slot}`));

  const isToday = todayIndex === day;

  return (
    <div>
      <LegumeBar />
      <StaleBar />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          sub={`Day ${day + 1} of ${totalDays}${
            isToday ? " — the next one with a meal to eat" : ""
          }`}
        >
          {isToday ? "Up next" : `Day ${day + 1}`}
        </SectionHeading>
      </div>

      {planFinished && (
        <Card tone="blush" className="mb-5">
          <h2 className="mb-1 font-semibold text-ink">That is the whole plan eaten</h2>
          <p className="text-sm text-ink">
            Every meal is ticked off or skipped. Nothing here goes out of date, so start the next
            one whenever it suits.
          </p>
          <Link
            href="/"
            className="mt-3 inline-flex min-h-[2.75rem] items-center rounded-lg bg-blush px-4 py-2.5 text-sm font-medium text-ink hover:bg-blush-deep"
          >
            Plan the next few meals
          </Link>
        </Card>
      )}

      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        <ShareButton
          text={dayToText(plan, day, getRecipe, notes)}
          title={`Day ${day + 1}`}
          label="Send this day"
        />
        <Button variant="ghost" onClick={() => setDayIndex(Math.max(0, day - 1))} disabled={day === 0}>
          Previous day
        </Button>
        <Button
          variant="ghost"
          onClick={() => setDayIndex(Math.min(totalDays - 1, day + 1))}
          disabled={day >= totalDays - 1}
        >
          Next day
        </Button>
        {!isToday && todayIndex !== null && (
          <Button variant="secondary" onClick={() => setDayIndex(todayIndex)}>
            Back to where you are
          </Button>
        )}
      </div>

      {viewedDayDone && todayIndex !== null && todayIndex > day && (
        <Card tone="blush" className="mb-5">
          <p className="text-sm text-ink">
            Day {day + 1} is done. The next meal is on day {todayIndex + 1}.
          </p>
          <div className="mt-3">
            <Button onClick={() => setDayIndex(todayIndex)}>
              Go to day {todayIndex + 1}
            </Button>
          </div>
        </Card>
      )}

      {prepSession && (
        <Card tone="sage" className="mb-5">
          <h2 className="mb-1 font-semibold text-ink">This is a prep day</h2>
          <p className="text-sm text-ink">
            {prepSession.cook.length} recipes to batch-cook, covering days{" "}
            {prepSession.coversDayIndices[0] + 1}–
            {prepSession.coversDayIndices[prepSession.coversDayIndices.length - 1] + 1}.
          </p>
          <Link
            href="/prep"
            className="mt-3 inline-flex min-h-[2.75rem] items-center rounded-lg bg-blush px-4 py-2.5 text-sm font-medium text-ink hover:bg-blush-deep"
          >
            Open the prep sheet
          </Link>
        </Card>
      )}

      {tomorrow.length > 0 && (
        <Card tone="blush" className="mb-5">
          <h2 className="mb-2 font-semibold text-ink">Take out of the freezer tonight</h2>
          <ul className="space-y-1">
            {tomorrow.map((m) => (
              <li key={`${m.dayIndex}:${m.slot}`} className="text-sm tabular-nums text-ink">
                <strong>
                  {m.cubesToDefrost
                    ? `${m.cubesToDefrost} cubes`
                    : `${m.portionsToDefrost ?? 1} portion${(m.portionsToDefrost ?? 1) === 1 ? "" : "s"}`}
                </strong>{" "}
                of {getRecipe(m.recipeId).title}
                <span className="text-ink-muted"> — for tomorrow&rsquo;s {m.slot}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-muted">
            Defrost in the fridge overnight, never at room temperature. Reheat until piping hot,
            then cool before serving.
          </p>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {meals.map((m) => {
          const key = `${m.dayIndex}:${m.slot}`;
          return (
            <div key={key} className="rounded-lg border border-sage-tint bg-white">
              <MealCard
                bare
                showRuleOut
                meal={m}
                plan={plan}
                allergensSeen={allergensSeen}
                onSwap={swapMeal}
                onToggleLock={toggleLock}
                showSlot={plan.settings.slots.length > 1}
              />

              {/* Attached to the meal, because that is what they are about. */}
              <div className="border-t border-sage-tint px-3 py-1">
                <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 text-sm text-ink-muted">
                  <input
                    type="checkbox"
                    checked={eaten.has(key)}
                    onChange={() => toggleEaten(m.dayIndex, m.slot)}
                    className="h-6 w-6 shrink-0 accent-blush-deep"
                  />
                  <span aria-live="polite">
                    {eaten.has(key)
                      ? getRecipe(m.recipeId).allergens.length > 0
                        ? `Eaten — ${getRecipe(m.recipeId)
                            .allergens.map((a) => ALLERGEN_LABELS[a].toLowerCase())
                            .join(", ")} recorded`
                        : "Eaten — recorded"
                      : "Eaten — records any new allergens"}
                  </span>
                </label>

                {/*
                  Babies refuse things and days get away from you. Without this
                  the only way to move the plan on was to tick "eaten" on food
                  they never touched — which also files a false first exposure.
                */}
                <button
                  type="button"
                  onClick={() => toggleSkipped(m.dayIndex, m.slot)}
                  aria-pressed={skipped.has(key)}
                  className={`min-h-[2.75rem] text-sm font-medium underline underline-offset-2 ${
                    skipped.has(key) ? "text-alert" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {skipped.has(key) ? "Skipped — nothing recorded" : "This one did not happen"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {tomorrow.length === 0 && (
        <p className="mt-5 text-sm text-ink-muted">
          Nothing to defrost tonight — tomorrow is from the fridge or made fresh.
        </p>
      )}
    </div>
  );
}
