"use client";

import { useState } from "react";
import { usePlan } from "@/components/PlanProvider";
import { MealCard } from "@/components/MealCard";
import { LegumeBanner, WarningList, NewAllergenNote, StaleBar } from "@/components/LegumeBanner";
import { Button, DAY_SHORT, SectionHeading, CopyButton } from "@/components/ui";
import { planToText } from "@/lib/shopping/merge";

const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export default function PlanPage() {
  const { plan, settings, ready, generating, regenerate, swapMeal, toggleLock, allergensSeen, todayIndex } =
    usePlan();
  const [week, setWeek] = useState(0);

  if (!ready) return <p className="text-ink-muted">Loading…</p>;

  if (!plan) {
    return (
      <div>
        <SectionHeading
          sub={`Legume-free ${settings.slots.join(" and ")} for the twins, batch-cooked in ice cube trays.`}
        >
          Make a plan
        </SectionHeading>
        <LegumeBanner />
        <div className="rounded-xl border border-sage-tint bg-white p-5">
          <h2 className="font-semibold text-ink">How many weeks?</h2>
          <p className="mt-1 mb-4 max-w-prose text-sm text-ink-muted">
            Two weeks is one prep session and one shop, and is what most people find manageable.
            Three or four splits into two of each, because four weeks of fresh food cannot sensibly
            be bought in a single trip.
          </p>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((w) => (
              <Button key={w} variant="ghost" onClick={() => regenerate({ weeks: w })}>
                {w} week{w > 1 ? "s" : ""}
                {w === 2 ? " · suggested" : ""}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const weeks = Array.from({ length: plan.settings.weeks }, (_, i) => i);
  const daysThisWeek = Array.from({ length: 7 }, (_, i) => week * 7 + i);
  const [y, mo, d] = plan.startDate.split("-").map(Number);
  const multiSlot = plan.settings.slots.length > 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          sub={`${plan.settings.weeks} week${plan.settings.weeks > 1 ? "s" : ""} · ${plan.settings.slots.join(" and ")} · day 1 is your prep day`}
        >
          The plan
        </SectionHeading>
        <div className="no-print flex gap-2">
          <CopyButton text={planToText(plan, DAY_NAMES_FULL)} label="Copy plan" />
          <Button onClick={() => regenerate()} disabled={generating} busy={generating}>
            {generating ? "Working…" : "Regenerate"}
          </Button>
        </div>
      </div>

      <LegumeBanner />
      <StaleBar />
      <WarningList warnings={plan.warnings} />

      {weeks.length > 1 && (
        <div className="no-print mb-4 flex flex-wrap gap-2">
          {weeks.map((w) => (
            <Button key={w} variant={w === week ? "primary" : "ghost"} onClick={() => setWeek(w)}>
              Week {w + 1}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {daysThisWeek.map((dayIndex) => {
          const meals = plan.meals.filter((m) => m.dayIndex === dayIndex);
          const isPrepDay = plan.prepSessions.some((s) => s.dayIndex === dayIndex);
          const isToday = todayIndex === dayIndex;
          const date = new Date(y, mo - 1, d + dayIndex);
          return (
            <div
              key={dayIndex}
              className={`space-y-2 rounded-xl p-2 ${isToday ? "bg-blush-tint" : ""}`}
            >
              <div className="flex items-baseline gap-2 px-1">
                <h2 className="font-semibold text-ink">{DAY_SHORT[dayIndex % 7]}</h2>
                <span className="text-xs tabular-nums text-ink-muted">{DATE_FMT.format(date)}</span>
                {isToday && <span className="text-xs font-medium text-ink">Today</span>}
                {isPrepDay && !isToday && <span className="text-xs font-medium text-ink">Prep day</span>}
              </div>
              {meals.length === 0 && (
                <p className="rounded-lg border border-dashed border-sage p-3 text-xs text-ink-muted">
                  No meal planned
                </p>
              )}
              {meals.map((m) => (
                <MealCard
                  key={`${m.dayIndex}:${m.slot}`}
                  meal={m}
                  plan={plan}
                  allergensSeen={allergensSeen}
                  onSwap={swapMeal}
                  onToggleLock={toggleLock}
                  showSlot={multiSlot}
                />
              ))}
            </div>
          );
        })}
      </div>

      <NewAllergenNote />
    </div>
  );
}
