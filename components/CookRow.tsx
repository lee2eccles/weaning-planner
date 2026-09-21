"use client";

import { useState } from "react";
import type { CookItem } from "@/lib/types";
import { getRecipe } from "@/lib/data/recipes";
import { displayName, meta } from "@/lib/data/ingredients";
import { batchLabel, scaleIngredients } from "@/lib/planner/portions";
import { Badge } from "./ui";
import { RecipeDetail } from "./RecipeDetail";

/**
 * One recipe on the prep sheet.
 *
 * The sheet used to name a recipe and a multiplier and stop there, which left
 * the cook doing nine multiplications per recipe, at the hob, from a page on
 * another tab. So the quantities open in place, already scaled, and the tick
 * survives a reload — because two hours in, "have I done the fishcakes?" is a
 * real question and opening the fridge is the only answer the app gave.
 */
export interface WavePlacement {
  /** Every wave this batch occupies, in order. A big batch can span two. */
  waves: number[];
  traysByWave: Map<number, number[]>;
}

/** "tray 4" · "trays 1–3" for a run · "trays 1, 4" when they are not adjacent. */
function trayLabel(trays: number[]): string {
  const sorted = [...trays].sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return `tray ${sorted[0]}`;
  const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1);
  return contiguous
    ? `trays ${sorted[0]}–${sorted[sorted.length - 1]}`
    : `trays ${sorted.join(", ")}`;
}

export function CookRow({
  item, cooked, onToggleCooked, cubesPerPortion, swaps = {}, position, wave, note,
}: {
  item: CookItem;
  cooked: boolean;
  onToggleCooked: () => void;
  cubesPerPortion: number;
  /** Notes written at the shop, keyed by ingredient. */
  swaps?: Record<string, string>;
  /** Position in the cooking order, 1-based. */
  position?: number;
  /** Which freezing wave this batch fills, and which trays. */
  wave?: WavePlacement;
  /** What you wrote about this recipe last time you cooked it. */
  note?: string;
}) {
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState(false);
  const r = getRecipe(item.recipeId);
  const scaled = scaleIngredients(r, item.batchMultiplier);

  // Batches step in halves, so a recipe often makes a little more than the plan
  // needs. Saying so beats an unlabelled tub in a freezer full of cubes.
  const accountedFor =
    item.toFridgePortions + item.toFreezerPortions + item.toFreezerCubes / cubesPerPortion;
  const spare = Math.round((item.portionsProduced - accountedFor) * 10) / 10;

  // What the shop did to this recipe. Worth knowing before you start it, not
  // when you reach for something that is not in the bag.
  const shopNotes = r.ingredients
    .filter((i) => swaps[i.item])
    .map((i) => ({ item: i.item, note: swaps[i.item] }));

  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <label className="-my-1 flex min-h-[3rem] cursor-pointer items-start gap-3 py-1 pr-2">
          <input
            type="checkbox"
            checked={cooked}
            onChange={onToggleCooked}
            className="mt-0.5 h-6 w-6 shrink-0 accent-blush-deep"
            aria-label={`Mark ${r.title} as cooked`}
          />
        </label>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className={`font-medium ${cooked ? "text-ink-muted line-through" : "text-ink"}`}>
              {position != null && (
                <span className="mr-1.5 tabular-nums text-ink-muted">{position}.</span>
              )}
              {r.title}
            </h4>
            <Badge tone="blush">{batchLabel(item.batchMultiplier)}</Badge>
          </div>

          {/* Where this batch is going the moment it comes off the heat. */}
          <p className="mt-0.5 text-xs font-medium tabular-nums text-ink-muted">
            {wave ? (
              <>
                Wave {wave.waves[0]}
                {wave.traysByWave.size === 0
                  ? " · baking tray"
                  : ` · ${trayLabel(wave.traysByWave.get(wave.waves[0]) ?? [])}`}
                {/* A batch that spans two waves is one bag filled six hours
                    apart — the trap worth naming, not hiding. */}
                {wave.waves.length > 1 && (
                  <span className="text-alert">
                    {" "}
                    · the rest goes in wave {wave.waves[wave.waves.length - 1]}, so leave that bag
                    open until then
                  </span>
                )}
              </>
            ) : (
              "Straight to the fridge — no tray needed"
            )}
          </p>

          <p className="mt-1 text-sm tabular-nums text-ink-muted">
            Makes about {item.portionsProduced} baby portions · about {r.activeMinutes} min
            {item.toFridgePortions > 0 && ` · ${item.toFridgePortions} to the fridge`}
            {item.toFreezerCubes > 0 && ` · ${item.toFreezerCubes} cubes to the freezer`}
            {item.toFreezerPortions > 0 &&
              ` · ${item.toFreezerPortions} portions frozen flat on a tray`}
          </p>

          {spare >= 0.5 && (
            <p className="mt-0.5 text-xs text-ink-muted">
              About {spare} spare portion{spare === 1 ? "" : "s"} — the batch does not divide
              evenly.{" "}
              {wave
                ? "Freeze it with the rest, in the same labelled bag."
                : "Keep it in the fridge and serve it within the usual days — it has no bag of its own."}
            </p>
          )}

          {r.freezableNote && (
            <p className="mt-0.5 text-xs text-alert">Only the {r.freezableNote} freezes.</p>
          )}

          {note && (
            <p className="mt-1.5 rounded-lg bg-sage-tint px-3 py-2 text-xs text-ink">
              <span className="font-medium">Your note: </span>
              {note}
            </p>
          )}

          {shopNotes.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 rounded-lg bg-alert-tint px-3 py-2">
              {shopNotes.map((n) => (
                <li key={n.item} className="text-xs text-ink">
                  <span className="font-medium">{displayName(n.item)}:</span> {n.note}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="min-h-[2.75rem] rounded-lg border border-sage bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-sage-tint"
            >
              {open ? "Hide the quantities" : `Show ${batchLabel(item.batchMultiplier).toLowerCase()} quantities`}
            </button>
            <button
              type="button"
              onClick={() => setFull(true)}
              aria-haspopup="dialog"
              className="min-h-[2.75rem] rounded-lg border border-sage bg-white px-3 py-2 text-sm font-medium text-ink hover:bg-sage-tint"
            >
              Full recipe
            </button>
          </div>

          {open && (
            <div className="mt-3 rounded-lg bg-cream p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Into the pan — already multiplied
              </p>
              <ul className="space-y-1">
                {scaled.map((i, idx) => (
                  <li key={idx} className={`text-sm ${swaps[i.item] ? "text-alert" : "text-ink"}`}>
                    {i.quantity != null && (
                      <span className="font-medium tabular-nums">
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
                    {/* Said again at the hob, because this is where it is done. */}
                    {meta(i.item).chokingNote ? (
                      <span className="mt-0.5 block text-xs text-alert">
                        {meta(i.item).chokingNote}
                      </span>
                    ) : null}
                    {i.optional ? <span className="text-ink-muted"> (optional)</span> : null}
                    {swaps[i.item] ? <span className="font-medium"> — {swaps[i.item]}</span> : null}
                  </li>
                ))}
              </ul>

              <ol className="mt-3 space-y-2">
                {r.method.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink">
                    <span className="shrink-0 font-semibold text-ink-muted">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              {r.tips.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-sage-tint pt-2">
                  {r.tips.map((t, i) => (
                    <li key={i} className="text-xs text-ink-muted">
                      {t}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {full && (
        <RecipeDetail recipe={r} scale={item.batchMultiplier} onClose={() => setFull(false)} />
      )}
    </li>
  );
}
