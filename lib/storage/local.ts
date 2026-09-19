"use client";

import type { Plan, PlanSettings } from "@/lib/types";

/**
 * localStorage wrapper. Browser-only persistence by design (PRD §12.4) — this
 * module is deliberately the single place that touches storage, so swapping in
 * a shared database later means changing this file and nothing else.
 *
 * Every access is wrapped: private windows, blocked site data and quota errors
 * all throw, and none of them should take the app down.
 */

const KEY = "jm-food:v1";
const SCHEMA_VERSION = 1;

interface Stored {
  version: number;
  plan: Plan | null;
  settings: PlanSettings | null;
  /** Allergens the twins have already been offered — for first-exposure marking. */
  allergensSeen: string[];
  /** Meals marked as eaten, as "dayIndex:slot". */
  eaten: string[];
  /** Shopping lines ticked off, as "shopIndex:item". */
  ticked: string[];
}

const EMPTY: Stored = { version: SCHEMA_VERSION, plan: null, settings: null, allergensSeen: [], eaten: [], ticked: [] };

export function load(): Stored {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Stored;
    if (parsed.version !== SCHEMA_VERSION) return EMPTY;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

export function save(patch: Partial<Stored>): void {
  if (typeof window === "undefined") return;
  try {
    const next = { ...load(), ...patch, version: SCHEMA_VERSION };
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable or full. The app keeps working from memory.
  }
}

export function clear(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export type { Stored };
