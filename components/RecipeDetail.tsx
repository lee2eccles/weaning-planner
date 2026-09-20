"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Recipe } from "@/lib/types";
import { AllergenBadges, CopyButton, RecipeMeta, SaveButton, ShareButton } from "./ui";
import { usePlan } from "./PlanProvider";
import { recipeToText } from "@/lib/text/export";
import { displayName } from "@/lib/data/ingredients";
import { batchLabel, scaleIngredients } from "@/lib/planner/portions";

export function RecipeDetail({
  recipe, onClose, allergensSeen, scale = 1,
}: {
  recipe: Recipe;
  onClose: () => void;
  allergensSeen?: Set<string>;
  /** Show the quantities already multiplied for a batch cook. */
  scale?: number;
}) {
  const { saved, toggleSaved, notes, setNote } = usePlan();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const mounted = useRef(false);

  // The note is edited locally and written on blur and on close, so that a
  // keystroke does not re-render the whole app through the plan context.
  const [note, setNoteDraft] = useState(notes[recipe.id] ?? "");
  const flush = useRef<() => void>(() => {});
  flush.current = () => {
    if (note !== (notes[recipe.id] ?? "")) setNote(recipe.id, note);
  };
  useEffect(() => () => flush.current(), []);

  useEffect(() => {
    mounted.current = true;
    restoreTo.current = document.activeElement as HTMLElement | null;

    // Move focus in, lock the page behind, and put it back on close. Without
    // this a keyboard user tabs straight out of the dialog into the page.
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      restoreTo.current?.focus?.();
    };
  }, [onClose]);

  // Rendered through a portal so it escapes the meal card's stacking context.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={recipe.title}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl bg-cream p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-xl font-semibold leading-tight text-ink">
            {recipe.title}
            {scale !== 1 && (
              <span className="block text-sm font-medium text-ink-muted">
                Quantities shown for a {batchLabel(scale).toLowerCase()}
              </span>
            )}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="min-h-[2.75rem] shrink-0 rounded-lg border border-sage px-4 font-medium text-ink hover:bg-sage-tint active:bg-sage"
          >
            Close
          </button>
        </div>

        <div className="no-print mb-4 flex flex-wrap gap-2">
          <SaveButton
            saved={saved.has(recipe.id)}
            onToggle={() => toggleSaved(recipe.id)}
            title={recipe.title}
          />
          <CopyButton text={recipeToText(recipe, note, scale)} label="Copy to notes" />
          <ShareButton text={recipeToText(recipe, note, scale)} title={recipe.title} />
        </div>

        {recipe.blurb && <p className="mb-3 text-sm italic text-ink-muted">{recipe.blurb}</p>}

        <div className="mb-3"><RecipeMeta recipe={recipe} /></div>
        <div className="mb-4">
          <AllergenBadges allergens={recipe.allergens} seen={allergensSeen} showNew={!!allergensSeen} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">
              Ingredients
            </h3>
            <p className="mb-2 text-xs text-ink-muted">
              Makes {Math.round(recipe.babyPortions * scale * 10) / 10} baby portion
              {recipe.babyPortions * scale === 1 ? "" : "s"}
              {recipe.cubesYielded ? ` — about ${Math.round(recipe.cubesYielded * scale)} cubes` : ""}
              {recipe.feedsAdultToo ? " (plus an adult portion)" : ""}
            </p>
            <ul className="space-y-1">
              {scaleIngredients(recipe, scale).map((i, idx) => (
                <li key={idx} className="text-sm text-ink">
                  {i.quantity != null && (
                    <span className="font-medium">
                      {i.quantity}
                      {i.unit && i.unit !== "piece"
                        ? i.unit === "g" || i.unit === "ml"
                          ? i.unit
                          : ` ${i.unit}`
                        : ""}{" "}
                    </span>
                  )}
                  {displayName(i.item)}
                  {i.note ? <span className="text-ink-muted"> — {i.note}</span> : null}
                  {i.optional ? <span className="text-ink-muted"> (optional)</span> : null}
                </li>
              ))}
            </ul>
            {recipe.specialEquipment?.length ? (
              <p className="mt-3 text-sm text-ink-muted">
                <strong className="text-ink">Equipment:</strong> {recipe.specialEquipment.join(", ")}
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-muted">Method</h3>
            <ol className="space-y-2">
              {recipe.method.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <span className="shrink-0 font-semibold text-ink-muted">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {recipe.tips.length > 0 && (
              <div className="mt-4 rounded-lg bg-sage-tint p-3">
                <p className="text-sm font-semibold text-ink">Tips</p>
                <ul className="mt-1 space-y-1">
                  {recipe.tips.map((t, i) => (
                    <li key={i} className="text-sm text-ink">{t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="no-print mt-5 border-t border-sage-tint pt-4">
          <label htmlFor="recipe-note" className="block text-sm font-semibold text-ink">
            Your notes
          </label>
          <p className="mt-0.5 text-xs text-ink-muted">
            What they actually ate, what you changed, what to double next time. Saved on this
            device, and included when you copy the recipe.
          </p>
          <textarea
            id="recipe-note"
            value={note}
            rows={5}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={() => flush.current()}
            placeholder="Ate the lot. Halve the cinnamon next time…"
            className="mt-2 min-h-[8rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-sage-tint pt-4 text-xs text-ink-muted">
          <span>Keeps {recipe.fridgeDays} day{recipe.fridgeDays === 1 ? "" : "s"} in the fridge</span>
          {recipe.freezable !== "no" && <span>· Freezes for 1 month</span>}
          {recipe.freezeFormat === "cube" && <span>· Freeze in ice cube trays</span>}
          {recipe.freezeFormat === "openFreeze" && <span>· Freeze flat on a tray, then bag</span>}
          <span>· About {recipe.activeMinutes} minutes hands-on</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
