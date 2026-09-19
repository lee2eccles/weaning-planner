"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MealSlot, Plan, PlanSettings } from "@/lib/types";
import { generatePlan, DEFAULT_SETTINGS, currentDayIndex } from "@/lib/planner/generate";
import { getRecipe } from "@/lib/data/recipes";
import { load, save } from "@/lib/storage/local";

interface PlanContextValue {
  plan: Plan | null;
  settings: PlanSettings;
  ready: boolean;
  generating: boolean;
  allergensSeen: Set<string>;
  eaten: Set<string>;
  regenerate: (settings?: Partial<PlanSettings>) => void;
  updateSettings: (patch: Partial<PlanSettings>) => void;
  swapMeal: (dayIndex: number, slot: MealSlot, recipeId: string) => void;
  /** Which day of the plan today is, or null if today falls outside it. */
  todayIndex: number | null;
  /** The plan was built with different settings to the ones now selected. */
  planIsStale: boolean;
  ticked: Set<string>;
  toggleTicked: (key: string) => void;
  toggleLock: (dayIndex: number, slot: MealSlot) => void;
  toggleEaten: (dayIndex: number, slot: MealSlot) => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [settings, setSettings] = useState<PlanSettings>(DEFAULT_SETTINGS);
  const [allergensSeen, setAllergensSeen] = useState<Set<string>>(new Set());
  const [eaten, setEaten] = useState<Set<string>>(new Set());
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const stored = load();
    if (stored.settings) setSettings({ ...DEFAULT_SETTINGS, ...stored.settings });
    if (stored.plan) setPlan(stored.plan);
    setAllergensSeen(new Set(stored.allergensSeen));
    setEaten(new Set(stored.eaten));
    setTicked(new Set(stored.ticked ?? []));
    setReady(true);
  }, []);

  function persist(next: { plan?: Plan | null; settings?: PlanSettings; eaten?: Set<string>; allergensSeen?: Set<string>; ticked?: Set<string> }) {
    save({
      ...(next.plan !== undefined ? { plan: next.plan } : {}),
      ...(next.settings ? { settings: next.settings } : {}),
      ...(next.eaten ? { eaten: [...next.eaten] } : {}),
      ...(next.allergensSeen ? { allergensSeen: [...next.allergensSeen] } : {}),
      ...(next.ticked ? { ticked: [...next.ticked] } : {}),
    });
  }

  function regenerate(patch?: Partial<PlanSettings>) {
    setGenerating(true);
    const nextSettings = { ...settings, ...patch };
    // Let the button's pressed state paint before the synchronous solve.
    setTimeout(() => {
      const locked = plan?.meals.filter((m) => m.locked) ?? [];
      const next = generatePlan({ settings: nextSettings, locked });
      setPlan(next);
      setSettings(nextSettings);
      setEaten(new Set());
      setTicked(new Set());
      persist({ plan: next, settings: nextSettings, eaten: new Set(), ticked: new Set() });
      setGenerating(false);
    }, 10);
  }

  function updateSettings(patch: Partial<PlanSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    persist({ settings: next });
  }

  function swapMeal(dayIndex: number, slot: MealSlot, recipeId: string) {
    if (!plan) return;
    // Keep every meal, changing only the swapped one — and preserve each meal's
    // own lock flag rather than locking the whole plan.
    const kept = plan.meals.map((m) =>
      m.dayIndex === dayIndex && m.slot === slot ? { ...m, recipeId } : m
    );
    const rebuilt = generatePlan({
      settings: plan.settings,
      locked: kept,
      restarts: 1,
      planId: plan.id,
      startDate: plan.startDate,
    });
    setPlan(rebuilt);
    persist({ plan: rebuilt });
  }

  function toggleLock(dayIndex: number, slot: MealSlot) {
    if (!plan) return;
    const next: Plan = {
      ...plan,
      meals: plan.meals.map((m) =>
        m.dayIndex === dayIndex && m.slot === slot ? { ...m, locked: !m.locked } : m
      ),
    };
    setPlan(next);
    persist({ plan: next });
  }

  function toggleTicked(key: string) {
    const next = new Set(ticked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setTicked(next);
    persist({ ticked: next });
  }

  function toggleEaten(dayIndex: number, slot: MealSlot) {
    const key = `${dayIndex}:${slot}`;
    const next = new Set(eaten);
    if (next.has(key)) next.delete(key);
    else {
      next.add(key);
      const meal = plan?.meals.find((m) => m.dayIndex === dayIndex && m.slot === slot);
      if (meal) {
        const seen = new Set(allergensSeen);
        for (const a of getRecipe(meal.recipeId).allergens) seen.add(a);
        setAllergensSeen(seen);
        persist({ allergensSeen: seen });
      }
    }
    setEaten(next);
    persist({ eaten: next });
  }

  const todayIndex = plan ? currentDayIndex(plan) : null;

  // A plan built for lunches only is not the plan you get after ticking
  // breakfast, and saying nothing is how people conclude the app is broken.
  const planIsStale =
    !!plan &&
    (plan.settings.weeks !== settings.weeks ||
      plan.settings.ageBandMonths !== settings.ageBandMonths ||
      plan.settings.slots.join() !== settings.slots.join() ||
      JSON.stringify(plan.settings.freezer) !== JSON.stringify(settings.freezer));

  const value = useMemo<PlanContextValue>(
    () => ({
      plan, settings, ready, generating, allergensSeen, eaten, ticked,
      todayIndex, planIsStale,
      regenerate, updateSettings, swapMeal, toggleLock, toggleEaten, toggleTicked,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, settings, ready, generating, allergensSeen, eaten, ticked, todayIndex, planIsStale]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}
