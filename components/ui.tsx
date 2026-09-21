"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Minus, Plus, Star } from "./icons";
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
export function StateLine({
  state, cubes, portions,
}: {
  state: MealState;
  cubes?: number;
  /** Portions, for food frozen flat rather than in cubes. */
  portions?: number;
}) {
  // "tonight" is only unambiguous on the day you are standing in. On the plan
  // grid the same words sit under a day heading and read as "defrost on that
  // evening" — a day late, with nothing to serve at lunch.
  const label =
    state === "defrost"
      ? cubes
        ? `Take ${cubes} cubes out the night before`
        : portions
          ? `Take ${portions} portion${portions === 1 ? "" : "s"} out the night before`
          : "Take out of the freezer the night before"
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
    primary:
      "bg-blush text-ink hover:bg-blush-deep active:bg-blush-deep disabled:bg-sage-tint disabled:text-ink-muted",
    secondary:
      "bg-sage-tint text-ink hover:bg-sage active:bg-sage disabled:bg-sage-tint disabled:text-ink-muted",
    ghost:
      "bg-transparent text-ink border border-sage hover:bg-sage-tint active:bg-sage disabled:border-sage-tint disabled:text-ink-muted",
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
      <h1 className="text-xl font-semibold text-ink">{children}</h1>
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

/**
 * A pill toggle for filters. `aria-pressed` rather than a checkbox because
 * these change what is listed immediately rather than submitting anything.
 */
export function Chip({
  children, pressed, onClick, count, note,
}: {
  children: React.ReactNode;
  pressed: boolean;
  onClick: () => void;
  count?: number;
  /** A quieter second fact about the same option, read as part of the label. */
  note?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`inline-flex min-h-[2.75rem] items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors duration-150 ${
        pressed
          ? "border-blush-deep bg-blush text-ink"
          : "border-sage bg-white text-ink-muted hover:bg-sage-tint"
      }`}
    >
      {/* The note sits under the label rather than beside it: side by side,
          a 320px phone wrapped each half independently and the pill came
          apart. Stacked, it survives every width and 200% zoom. */}
      {note ? (
        <span className="flex flex-col items-center leading-tight">
          <span className="tabular-nums">{children}</span>
          <span className={`text-xs font-normal ${pressed ? "text-ink" : "text-ink-muted"}`}>
            {note}
          </span>
        </span>
      ) : (
        children
      )}
      {count != null && (
        <span className={`tabular-nums text-xs ${pressed ? "text-ink" : "text-ink-muted"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/** Segmented control — one of a small set, always visible, never a dropdown. */
export function Segmented<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex max-w-full flex-wrap gap-1 rounded-lg border border-sage bg-white p-1"
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`min-h-[2.5rem] rounded-md px-4 text-sm font-medium transition-colors duration-150 ${
              on ? "bg-blush text-ink" : "text-ink-muted hover:bg-sage-tint"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Number entry with buttons either side. A tired parent should be able to add
 * a day one-handed, but typing 21 directly still has to work.
 */
export function Stepper({
  label, value, min, max, step = 1, unit, onChange, hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const id = useId();

  /**
   * Stepping lands on the next multiple of `step` in the direction pressed,
   * rather than adding to whatever is in the box. With a step of one that is
   * plain +1; with a step of two — a day of breakfast and lunch — it means
   * the buttons can only ever produce a size the planner can actually cook,
   * even when the number was typed in by hand.
   */
  const nudge = (dir: 1 | -1) => {
    const next =
      dir === 1
        ? (Math.floor(value / step) + 1) * step
        : (Math.ceil(value / step) - 1) * step;
    onChange(clamp(next));
  };

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      {/* Wraps rather than clips: at 200% zoom the three controls no longer
          fit on one line, and the + button used to sit off the card. */}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => nudge(-1)}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-lg border border-sage bg-white text-ink hover:bg-sage-tint disabled:border-sage-tint disabled:text-ink-muted"
        >
          <Minus />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          step={step}
          autoComplete="off"
          onChange={(e) => onChange(clamp(Number(e.target.value)))}
          /* Narrow enough to give way when the row is squeezed, wide enough
             to keep two digits readable when it does. */
          className="min-h-[2.75rem] w-20 min-w-[3rem] rounded-lg border border-sage bg-white px-2 py-2 text-center text-ink tabular-nums"
        />
        <button
          type="button"
          onClick={() => nudge(1)}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-lg border border-sage bg-white text-ink hover:bg-sage-tint disabled:border-sage-tint disabled:text-ink-muted"
        >
          <Plus />
        </button>
        {unit && <span className="text-sm text-ink-muted">{unit}</span>}
      </div>
      {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/** Search box with a clear button, for the recipe library. */
export function SearchInput({
  value, onChange, label, placeholder, describedBy,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  describedBy?: string;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  /**
   * "/" jumps to the box from anywhere on the page, and Escape clears it —
   * the two keys that make a search box feel like a search box. Both are
   * ignored while another field has focus, so typing a note never steals it.
   */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);

      if (e.key === "/" && !typing) {
        e.preventDefault();
        input.current?.focus();
      } else if (e.key === "Escape" && el === input.current) {
        onChange("");
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onChange]);
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        <span className="ml-2 font-normal text-ink-muted max-sm:hidden">press / to jump here</span>
      </label>
      <input
        id={id}
        ref={input}
        type="search"
        name="q"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-describedby={describedBy}
        className="min-h-[2.75rem] w-full rounded-lg border border-sage bg-white py-2 pl-4 pr-20 text-ink placeholder:text-ink-muted/70"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute bottom-0 right-0 flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-r-lg text-sm font-medium text-ink-muted hover:text-ink"
        >
          Clear
        </button>
      )}
    </div>
  );
}

/** Save a recipe to the list you cook from. Toggle, not a one-way action. */
export function SaveButton({
  saved, onToggle, title, size = "default",
}: {
  saved: boolean;
  onToggle: () => void;
  title: string;
  size?: "default" | "compact";
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from saved` : `Save ${title}`}
      className={`inline-flex min-h-[2.75rem] shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 ${
        saved
          ? "border-blush-deep bg-blush text-ink"
          : "border-sage bg-white text-ink-muted hover:bg-sage-tint"
      } ${size === "compact" ? "px-2.5" : ""}`}
    >
      <Star filled={saved} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

/**
 * Share a plan or a list the way it actually gets shared: to the other parent,
 * on WhatsApp.
 *
 * The native share sheet is the right answer where it exists — it offers
 * WhatsApp alongside Messages and everything else, and needs no permission.
 * Desktop browsers mostly lack it, so the fallback is WhatsApp's own web
 * handler, and if a popup blocker eats that, the clipboard.
 */
export function ShareButton({
  text, title, label = "Share",
}: {
  text: string;
  title: string;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch (error) {
        // A cancelled share sheet is a decision, not a failure.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    const opened = window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    if (opened) return;

    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant="secondary" onClick={share}>
        <span aria-live="polite">{state === "copied" ? "Copied" : label}</span>
      </Button>
      {state === "failed" && (
        <span role="status" className="max-w-[16rem] text-xs text-alert">
          Sharing was blocked. Select the text on screen to copy it by hand.
        </span>
      )}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      // Clipboard blocked: insecure context, or permission denied. Failing
      // quietly meant pressing the button did nothing and said nothing.
      setState("failed");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant="secondary" onClick={copy}>
        <span aria-live="polite">{state === "copied" ? "Copied" : label}</span>
      </Button>
      {state === "failed" && (
        <span role="status" className="max-w-[16rem] text-xs text-alert">
          Your browser blocked the clipboard. Use your phone&rsquo;s share or select the text on
          screen instead.
        </span>
      )}
    </span>
  );
}
