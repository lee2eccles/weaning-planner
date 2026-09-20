"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MealSlot, Plan, PlanSettings } from "@/lib/types";
import { generatePlan, DEFAULT_SETTINGS, currentDayIndex } from "@/lib/planner/generate";
import { planDays } from "@/lib/planner/coverage";
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
  /** Recipes saved to the cook-from list. */
  saved: Set<string>;
  toggleSaved: (recipeId: string) => void;
  /** The parent's own notes, keyed by recipe id. */
  notes: Record<string, string>;
  setNote: (recipeId: string, text: string) => void;
  /** Prep-day recipes already cooked, as "sessionIndex:recipeId". */
  cooked: Set<string>;
  toggleCooked: (key: string) => void;
  /** Where you were on the Shop tab. */
  shop: { listIndex: number; hideStaples: boolean };
  setShop: (patch: Partial<{ listIndex: number; hideStaples: boolean }>) => void;
  /** What you actually bought, keyed by ingredient — written in the aisle. */
  swaps: Record<string, string>;
  setSwap: (item: string, text: string) => void;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [settings, setSettings] = useState<PlanSettings>(DEFAULT_SETTINGS);
  const [allergensSeen, setAllergensSeen] = useState<Set<string>>(new Set());
  const [eaten, setEaten] = useState<Set<string>>(new Set());
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [cooked, setCooked] = useState<Set<string>>(new Set());
  const [shop, setShopState] = useState({ listIndex: 0, hideStaples: true });
  const [swaps, setSwaps] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const stored = load();
    if (stored.settings) setSettings({ ...DEFAULT_SETTINGS, ...stored.settings });
    if (stored.plan) setPlan(stored.plan);
    setAllergensSeen(new Set(stored.allergensSeen));
    setEaten(new Set(stored.eaten));
    setTicked(new Set(stored.ticked ?? []));
    setSaved(new Set(stored.saved ?? []));
    setNotes(stored.notes ?? {});
    setCooked(new Set(stored.cooked ?? []));
    setShopState(stored.shop ?? { listIndex: 0, hideStaples: true });
    setSwaps(stored.swaps ?? {});
    setReady(true);
  }, []);

  function persist(next: {
    plan?: Plan | null;
    settings?: PlanSettings;
    eaten?: Set<string>;
    allergensSeen?: Set<string>;
    ticked?: Set<string>;
    saved?: Set<string>;
    notes?: Record<string, string>;
    cooked?: Set<string>;
    shop?: { listIndex: number; hideStaples: boolean };
    swaps?: Record<string, string>;
  }) {
    save({
      ...(next.plan !== undefined ? { plan: next.plan } : {}),
      ...(next.settings ? { settings: next.settings } : {}),
      ...(next.eaten ? { eaten: [...next.eaten] } : {}),
      ...(next.allergensSeen ? { allergensSeen: [...next.allergensSeen] } : {}),
      ...(next.ticked ? { ticked: [...next.ticked] } : {}),
      ...(next.saved ? { saved: [...next.saved] } : {}),
      ...(next.notes ? { notes: next.notes } : {}),
      ...(next.cooked ? { cooked: [...next.cooked] } : {}),
      ...(next.shop ? { shop: next.shop } : {}),
      ...(next.swaps ? { swaps: next.swaps } : {}),
    });
  }

  function regenerate(patch?: Partial<PlanSettings>) {
    setGenerating(true);
    const nextSettings = { ...settings, ...patch };
    // Let the button's pressed state paint before the synchronous solve.
    setTimeout(() => {
      const locked = plan?.meals.filter((m) => m.locked) ?? [];
      const next = generatePlan({ settings: nextSettings, locked, preferred: [...saved] });
      setPlan(next);
      setSettings(nextSettings);
      setEaten(new Set());
      setTicked(new Set());
      setCooked(new Set());
      setSwaps({});
      persist({
        plan: next, settings: nextSettings,
        eaten: new Set(), ticked: new Set(), cooked: new Set(), swaps: {},
      });
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
      preferred: [...saved],
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

  function toggleSaved(recipeId: string) {
    const next = new Set(saved);
    if (next.has(recipeId)) next.delete(recipeId);
    else next.add(recipeId);
    setSaved(next);
    persist({ saved: next });
  }

  /**
   * An empty note is deleted rather than stored, so "has a note" stays a
   * reliable signal on a recipe card.
   */
  function setNote(recipeId: string, text: string) {
    const next = { ...notes };
    if (text.trim() === "") delete next[recipeId];
    else next[recipeId] = text;
    setNotes(next);
    persist({ notes: next });
  }

  function toggleCooked(key: string) {
    const next = new Set(cooked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCooked(next);
    persist({ cooked: next });
  }

  function setShop(patch: Partial<{ listIndex: number; hideStaples: boolean }>) {
    const next = { ...shop, ...patch };
    setShopState(next);
    persist({ shop: next });
  }

  /** An empty note is removed, so "has a note" stays a reliable signal. */
  function setSwap(item: string, text: string) {
    const next = { ...swaps };
    if (text.trim() === "") delete next[item];
    else next[item] = text.trim();
    setSwaps(next);
    persist({ swaps: next });
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
    (planDays(plan.settings) !== planDays(settings) ||
      plan.settings.eaters !== settings.eaters ||
      plan.settings.ageBandMonths !== settings.ageBandMonths ||
      plan.settings.slots.join() !== settings.slots.join() ||
      JSON.stringify(plan.settings.freezer) !== JSON.stringify(settings.freezer));

  const value = useMemo<PlanContextValue>(
    () => ({
      plan, settings, ready, generating, allergensSeen, eaten, ticked, saved, notes, cooked, shop, swaps,
      todayIndex, planIsStale,
      regenerate, updateSettings, swapMeal, toggleLock, toggleEaten, toggleTicked,
      toggleSaved, setNote, toggleCooked, setShop, setSwap,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plan, settings, ready, generating, allergensSeen, eaten, ticked, saved, notes, cooked, shop, swaps, todayIndex, planIsStale]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used inside PlanProvider");
  return ctx;
}
