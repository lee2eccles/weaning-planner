"use client";

import { useState } from "react";
import Link from "next/link";
import type { Allergen, MealState, Recipe } from "@/lib/types";
import { ALLERGEN_LABELS } from "@/lib/types";

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Badge({
  children, tone = "sage", title,
}: {
  children: React.ReactNode;
  tone?: "sage" | "blush" | "alert" | "quiet";
  title?: string;
}) {
  const tones = {
    sage: "bg-sage-tint text-ink",
    blush: "bg-blush-tint text-ink",
    alert: "bg-alert-tint text-alert",
    quiet: "bg-transparent text-ink-muted border border-sage",
  };
  return (
    <span
      title={title}
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium leading-5 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

const STATE_LABEL: Record<MealState, string> = {
  cookToday: "Cook today",
  fromFridge: "From the fridge",
  defrost: "Defrost",
  noCook: "Make fresh",
};

/**
 * The meal state is the one thing on a card the parent must act on, so it is
 * rendered as weighted text rather than as another pill competing with
 * "Milk" and "Fish" at identical size.
 */
export function StateLine({ state, cubes }: { state: MealState; cubes?: number }) {
  const label =
    state === "defrost"
      ? cubes
        ? `Defrost ${cubes} cubes tonight`
        : "Take out of the freezer"
      : STATE_LABEL[state];
  const emphatic = state === "defrost" || state === "cookToday";
  return (
    <p
      className={`text-sm leading-snug tabular-nums ${
        emphatic ? "font-semibold text-ink" : "text-ink-muted"
      }`}
    >
      {label}
    </p>
  );
}

export function AllergenBadges({
  allergens, seen, showNew = false,
}: {
  allergens: Allergen[];
  seen?: Set<string>;
  showNew?: boolean;
}) {
  if (allergens.length === 0) return null;
  // Until at least one meal has been marked eaten there is nothing to compare
  // against, and marking everything "new" is noise rather than signal.
  const canCompare = showNew && seen != null && seen.size > 0;
  return (
    <span className="flex flex-wrap gap-1">
      {allergens.map((a) => {
        const isNew = canCompare && !seen!.has(a);
        return (
          <Badge key={a} tone={isNew ? "blush" : "quiet"}>
            {ALLERGEN_LABELS[a]}
            {isNew ? " · new" : ""}
          </Badge>
        );
      })}
    </span>
  );
}

export function Button({
  children, onClick, variant = "primary", disabled, busy, type = "button", className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  busy?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants = {
    // Ink on blush — 7.5:1. Never white on blush, which fails AA.
    primary: "bg-blush text-ink hover:bg-blush-deep active:bg-blush-deep disabled:opacity-50",
    secondary: "bg-sage-tint text-ink hover:bg-sage active:bg-sage disabled:opacity-50",
    ghost: "bg-transparent text-ink border border-sage hover:bg-sage-tint active:bg-sage disabled:opacity-50",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy || undefined}
      className={`inline-flex min-h-[2.75rem] items-center justify-center rounded-lg px-4 py-2.5 font-medium transition-colors duration-150 active:scale-[0.98] disabled:cursor-not-allowed motion-reduce:active:scale-100 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * `tone` is a prop rather than a caller-supplied `bg-*` class: in Tailwind v4
 * stylesheet order decides, so a caller appending `bg-blush-tint` to a
 * hard-coded `bg-white` silently lost every emphasis colour in the app.
 */
export function Card({
  children, className = "", tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "blush" | "sage";
}) {
  const tones = {
    default: "border-sage-tint bg-white",
    blush: "border-blush bg-blush-tint",
    sage: "border-sage bg-sage-tint",
  };
  return <div className={`rounded-xl border p-4 ${tones[tone]} ${className}`}>{children}</div>;
}

/** Empty states should teach the screen, not just report absence. */
export function EmptyState({
  title, body, action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-sage bg-white px-5 py-8 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-prose text-sm text-ink-muted">{body}</p>
      <div className="mt-4 flex justify-center">
        {action ?? (
          <Link
            href="/"
            className="inline-flex min-h-[2.75rem] items-center rounded-lg bg-blush px-4 py-2.5 font-medium text-ink hover:bg-blush-deep"
          >
            Make a plan
          </Link>
        )}
      </div>
    </div>
  );
}

export function SectionHeading({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-ink">{children}</h2>
      {sub && <p className="mt-1 text-sm text-ink-muted">{sub}</p>}
    </div>
  );
}

/** One quiet meta line. Eight competing pills made recipe grids unbrowsable. */
export function RecipeMeta({ recipe }: { recipe: Recipe }) {
  const parts: string[] = [];
  if (recipe.vegetarian) parts.push("Vegetarian");
  if (recipe.glutenFree) parts.push("Gluten free");
  if (recipe.freezable !== "no") {
    parts.push(recipe.freezableNote ? `Freezes (${recipe.freezableNote})` : "Freezes");
  }
  if (recipe.noCook) parts.push("No cook");
  if (recipe.longRecipe) parts.push("Longer recipe");
  if (recipe.ironRich) parts.push("Good for iron");
  parts.push(`${recipe.activeMinutes} min`);

  return (
    <p className="text-xs leading-relaxed text-ink-muted">
      {parts.join(" · ")}
      {recipe.saltAware && (
        <span className="text-alert"> · Saltier — two or more salty components</span>
      )}
    </p>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context, or permission denied).
      // The text is on screen to select by hand, so fail quietly.
    }
  }

  return (
    <Button variant="secondary" onClick={copy}>
      {copied ? "Copied" : label}
    </Button>
  );
}
