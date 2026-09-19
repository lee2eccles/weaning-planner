"use client";

import { useEffect, useState } from "react";
import { usePlan } from "@/components/PlanProvider";
import { MealCard } from "@/components/MealCard";
import { Button, SectionHeading, Card, EmptyState } from "@/components/ui";
import { LegumeBar, StaleBar } from "@/components/LegumeBanner";
import { getRecipe } from "@/lib/data/recipes";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

export default function TodayPage() {
  const { plan, ready, swapMeal, toggleLock, allergensSeen, eaten, toggleEaten, todayIndex } = usePlan();
  const [dayIndex, setDayIndex] = useState<number | null>(null);

  // Start on the real today, not day one — and only once the plan has loaded.
  useEffect(() => {
    if (plan && dayIndex === null) setDayIndex(todayIndex ?? 0);
  }, [plan, todayIndex, dayIndex]);

  if (!ready) return <p className="text-ink-muted">Loading…</p>;
  if (!plan) {
    return (
      <EmptyState
        title="Nothing planned yet"
        body="This screen shows just today's meals and what to take out of the freezer tonight — the one page to check when you are in the middle of things."
      />
    );
  }

  const day = dayIndex ?? 0;
  const totalDays = plan.settings.weeks * 7;
  const meals = plan.meals.filter((m) => m.dayIndex === day);
  const tomorrow = plan.meals.filter((m) => m.dayIndex === day + 1 && m.state === "defrost");

  const [y, mo, d] = plan.startDate.split("-").map(Number);
  const date = new Date(y, mo - 1, d + day);
  const isToday = todayIndex === day;
  const outsidePlan = todayIndex === null;

  return (
    <div>
      <LegumeBar />
      <StaleBar />

      <SectionHeading
        sub={`${DATE_FMT.format(date)} · day ${day + 1} of ${totalDays}${isToday ? "" : " — not today"}`}
      >
        {isToday ? "Today" : DATE_FMT.format(date)}
      </SectionHeading>

      {outsidePlan && (
        <p className="mb-4 rounded-xl border border-blush bg-blush-tint px-4 py-3 text-sm text-ink">
          Today&rsquo;s date falls outside this plan. Showing day 1 instead — make a new plan when
          you are ready to start the next fortnight.
        </p>
      )}

      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
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
            Back to today
          </Button>
        )}
      </div>

      {tomorrow.length > 0 && (
        <Card tone="blush" className="mb-5">
          <h2 className="mb-2 font-semibold text-ink">Take out of the freezer tonight</h2>
          <ul className="space-y-1">
            {tomorrow.map((m) => (
              <li key={`${m.dayIndex}:${m.slot}`} className="text-sm tabular-nums text-ink">
                <strong>{m.cubesToDefrost ?? ""} cubes</strong> of {getRecipe(m.recipeId).title}
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
            <div key={key} className="space-y-2">
              <MealCard
                meal={m}
                plan={plan}
                allergensSeen={allergensSeen}
                onSwap={swapMeal}
                onToggleLock={toggleLock}
                showSlot={plan.settings.slots.length > 1}
              />
              <label className="flex min-h-[2.75rem] cursor-pointer items-center gap-3 px-1 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={eaten.has(key)}
                  onChange={() => toggleEaten(m.dayIndex, m.slot)}
                  className="h-6 w-6 shrink-0 accent-blush-deep"
                />
                Eaten — records any new allergens
              </label>
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
