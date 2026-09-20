import type { Coverage, CoverageMode, PlanSettings } from "@/lib/types";

/**
 * Turning "how much food do I need?" into a number of days.
 *
 * Everything downstream — the planner, the prep sheet, the shopping lists —
 * works in days. This module is the only place that knows a plan can also be
 * asked for in weeks or in portions, which keeps that flexibility from leaking
 * into the solver. PRD §5.5.
 */

export const MIN_DAYS = 1;
/** Four weeks. Beyond that the fresh food stops being fresh. */
export const MAX_DAYS = 28;

export const MIN_EATERS = 1;
export const MAX_EATERS = 8;

/** Coverage constructors, so callers read as the thing they are asking for. */
export const days = (value: number): Coverage => ({ mode: "days", value });
export const weeks = (value: number): Coverage => ({ mode: "weeks", value });
export const portions = (value: number): Coverage => ({ mode: "portions", value });

export function clampDays(n: number): number {
  if (!Number.isFinite(n)) return MIN_DAYS;
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(n)));
}

/** Portions produced by one day of the plan — one per eater, per meal slot. */
export function portionsPerDay(settings: Pick<PlanSettings, "slots" | "eaters">): number {
  return Math.max(1, settings.slots.length) * Math.max(MIN_EATERS, settings.eaters);
}

/** How many days the plan runs for. The canonical number. */
export function planDays(settings: Pick<PlanSettings, "coverage" | "slots" | "eaters">): number {
  const { mode, value } = settings.coverage;
  if (mode === "weeks") return clampDays(value * 7);
  if (mode === "portions") return clampDays(Math.ceil(value / portionsPerDay(settings)));
  return clampDays(value);
}

/** Baby portions the plan actually produces. */
export function portionsPlanned(settings: Pick<PlanSettings, "coverage" | "slots" | "eaters">): number {
  return planDays(settings) * portionsPerDay(settings);
}

/**
 * A portions target rarely divides into whole days, and the plan always rounds
 * up — being asked for 30 portions and handed 28 is the failure mode worth
 * avoiding. This is the surplus, so the UI can own up to it.
 */
export function portionsOvershoot(settings: Pick<PlanSettings, "coverage" | "slots" | "eaters">): number {
  if (settings.coverage.mode !== "portions") return 0;
  return Math.max(0, portionsPlanned(settings) - Math.round(settings.coverage.value));
}

export function daysLabel(days: number): string {
  if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
  const w = Math.floor(days / 7);
  const d = days % 7;
  const weeksPart = `${w} week${w === 1 ? "" : "s"}`;
  if (d === 0) return weeksPart;
  return `${weeksPart} and ${d} day${d === 1 ? "" : "s"}`;
}

/** "14 days · 28 portions" — the phrase that appears under every heading. */
export function coverageSummary(settings: Pick<PlanSettings, "coverage" | "slots" | "eaters">): string {
  const days = planDays(settings);
  return `${daysLabel(days)} · ${portionsPlanned(settings)} portions`;
}

/** Same coverage expressed in another unit, for switching the picker's mode. */
export function convertCoverage(
  settings: Pick<PlanSettings, "coverage" | "slots" | "eaters">,
  mode: CoverageMode
): Coverage {
  if (mode === settings.coverage.mode) return settings.coverage;
  const days = planDays(settings);
  if (mode === "days") return { mode, value: days };
  if (mode === "weeks") return { mode, value: Math.max(1, Math.round(days / 7)) };
  return { mode, value: days * portionsPerDay(settings) };
}

/** Bounds for the picker's stepper, in the unit currently being used. */
export function coverageBounds(
  settings: Pick<PlanSettings, "slots" | "eaters">,
  mode: CoverageMode
): { min: number; max: number; step: number } {
  if (mode === "weeks") return { min: 1, max: MAX_DAYS / 7, step: 1 };
  if (mode === "days") return { min: MIN_DAYS, max: MAX_DAYS, step: 1 };
  const per = portionsPerDay(settings);
  return { min: per, max: MAX_DAYS * per, step: per };
}

export function clampCoverage(
  coverage: Coverage,
  settings: Pick<PlanSettings, "slots" | "eaters">
): Coverage {
  const { min, max } = coverageBounds(settings, coverage.mode);
  const value = Number.isFinite(coverage.value) ? Math.round(coverage.value) : min;
  return { mode: coverage.mode, value: Math.min(max, Math.max(min, value)) };
}
