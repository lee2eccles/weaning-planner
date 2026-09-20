"use client";

import { useState } from "react";
import Link from "next/link";
import { usePlan } from "@/components/PlanProvider";
import { MealCard } from "@/components/MealCard";
import { PlanSetup } from "@/components/PlanSetup";
import { LegumeBanner, WarningList, NewAllergenNote, StaleBar } from "@/components/LegumeBanner";
import { Button, SectionHeading, CopyButton } from "@/components/ui";
import { ArrowRight } from "@/components/icons";
import { planToText } from "@/lib/shopping/merge";
import { coverageSummary, planDays } from "@/lib/planner/coverage";

const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

export default function PlanPage() {
  const {
    plan, ready, generating, regenerate, swapMeal, toggleLock, allergensSeen, todayIndex,
    ticked, eaten,
  } = usePlan();
  const [week, setWeek] = useState(0);
  const [adjusting, setAdjusting] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  // Rebuilding throws away the shopping ticks and the eaten marks, which is a
  // real loss halfway round a supermarket. Ask first, but only when there is
  // something to lose.
  const atRisk = ticked.size + eaten.size;

  function rebuild() {
    if (atRisk > 0 && !confirmRegen) {
      setConfirmRegen(true);
      return;
    }
    setConfirmRegen(false);
    setAdjusting(false);
    regenerate();
  }

  if (!ready) return <p className="text-ink-muted">Loading…</p>;

  if (!plan) {
    return (
      <div>
        <SectionHeading sub="Three steps: set the size of the plan, shop from one merged list, then cook it all in one session.">
          Make a plan
        </SectionHeading>
        <LegumeBanner />
        <PlanSetup onSubmit={() => regenerate()} busy={generating} />
      </div>
    );
  }

  const totalDays = planDays(plan.settings);
  const weekCount = Math.ceil(totalDays / 7);
  const currentWeek = Math.min(week, weekCount - 1);
  const daysThisWeek = Array.from(
    { length: Math.min(7, totalDays - currentWeek * 7) },
    (_, i) => currentWeek * 7 + i
  );
  const [y, mo, d] = plan.startDate.split("-").map(Number);
  const multiSlot = plan.settings.slots.length > 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          sub={`${coverageSummary(plan.settings)} · ${
            plan.prepSessions.length > 1
              ? `prep days ${plan.prepSessions.map((s) => s.dayIndex + 1).join(" and ")}`
              : "day 1 is your prep day"
          }`}
        >
          The plan
        </SectionHeading>
        <div className="no-print flex flex-wrap gap-2">
          <CopyButton text={planToText(plan, DAY_NAMES_FULL)} label="Copy plan" />
          <Button variant="ghost" onClick={rebuild} disabled={generating} busy={generating}>
            {generating ? "Working…" : "Regenerate"}
          </Button>
        </div>
      </div>

      <LegumeBanner />
      <StaleBar />
      <WarningList warnings={plan.warnings} />

      {confirmRegen && (
        <div className="no-print mb-5 rounded-xl border border-alert/40 bg-alert-tint px-4 py-3">
          <p className="text-sm text-ink">
            Rebuilding starts the plan again: {ticked.size} shopping tick
            {ticked.size === 1 ? "" : "s"} and {eaten.size} meal
            {eaten.size === 1 ? "" : "s"} marked eaten will be cleared. Meals you have locked are
            kept.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => setConfirmRegen(false)}>Keep this plan</Button>
            <Button variant="ghost" onClick={rebuild} disabled={generating} busy={generating}>
              {generating ? "Working…" : "Rebuild anyway"}
            </Button>
          </div>
        </div>
      )}

      {/* What to do next, in the order it happens. */}
      <nav aria-label="Next steps" className="no-print mb-5 grid gap-2 sm:grid-cols-2">
        <Link
          href="/shop"
          className="flex min-h-[2.75rem] items-center justify-between rounded-xl bg-blush px-4 py-3 font-medium text-ink hover:bg-blush-deep"
        >
          <span>Shop the merged list</span>
          <ArrowRight />
        </Link>
        <Link
          href="/prep"
          className="flex min-h-[2.75rem] items-center justify-between rounded-xl border border-sage bg-white px-4 py-3 text-sm font-medium text-ink hover:bg-sage-tint"
        >
          <span>Then cook it on prep day</span>
          <ArrowRight />
        </Link>
      </nav>

      <div className="no-print mb-5">
        <Button variant="ghost" onClick={() => setAdjusting((a) => !a)} aria-expanded={adjusting}>
          {adjusting ? "Hide plan size" : "Change plan size"}
        </Button>
        {adjusting && (
          <div className="mt-3">
            <PlanSetup onSubmit={rebuild} submitLabel="Rebuild the plan" busy={generating} />
          </div>
        )}
      </div>

      {weekCount > 1 && (
        <div className="no-print mb-4 flex flex-wrap gap-2">
          {Array.from({ length: weekCount }, (_, w) => (
            <Button
              key={w}
              variant={w === currentWeek ? "primary" : "ghost"}
              onClick={() => setWeek(w)}
            >
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
                <h2 className="font-semibold text-ink">{WEEKDAY_FMT.format(date)}</h2>
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
