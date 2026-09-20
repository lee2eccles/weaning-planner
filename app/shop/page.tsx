"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePlan } from "@/components/PlanProvider";
import { buildShoppingLists, shoppingListToText, formatLine } from "@/lib/shopping/merge";
import { Button, Card, CopyButton, SectionHeading, EmptyState } from "@/components/ui";
import { LegumeBar, StaleBar } from "@/components/LegumeBanner";
import { SwapNote } from "@/components/SwapNote";
import { Chevron } from "@/components/icons";
import { AISLE_LABELS, type Aisle } from "@/lib/types";

export default function ShopPage() {
  const { plan, ready, ticked, toggleTicked, shop, setShop, swaps, setSwap } = usePlan();
  // Which list you are on and whether staples are hidden are persisted: a
  // locked phone in aisle four should not put you back on week one.
  const { hideStaples } = shop;
  const listIndex = shop.listIndex;
  const [expanded, setExpanded] = useState<string | null>(null);

  const lists = useMemo(() => (plan ? buildShoppingLists(plan) : []), [plan]);

  if (!ready) return <p className="text-ink-muted">Loading…</p>;
  if (!plan) {
    return (
      <EmptyState
        title="No shopping list yet"
        body="Once you make a plan, this becomes one merged list — quantities added up across recipes, sorted the way you walk round a shop, and tickable as you go."
      />
    );
  }

  const list = lists[Math.min(listIndex, lists.length - 1)];
  const visible = list.lines.filter((l) => !hideStaples || !l.isPantryStaple);
  const hiddenCount = list.lines.length - visible.length;
  const doneCount = visible.filter((l) => ticked.has(`${list.shopIndex}:${l.item}`)).length;

  // Group into aisles so the heading carries the label once, instead of every row.
  const groups: { aisle: Aisle; lines: typeof visible }[] = [];
  for (const line of visible) {
    const last = groups[groups.length - 1];
    if (last && last.aisle === line.aisle) last.lines.push(line);
    else groups.push({ aisle: line.aisle, lines: [line] });
  }

  return (
    <div>
      <LegumeBar />
      <StaleBar />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <SectionHeading
          sub={`Days ${list.coversDays[0] + 1}–${list.coversDays[1] + 1} · ${doneCount} of ${visible.length} in the trolley`}
        >
          {list.label}
        </SectionHeading>
        <div className="no-print flex flex-wrap gap-2">
          <CopyButton
            text={shoppingListToText(list, !hideStaples, ticked, swaps)}
            label="Copy what is left"
          />
        </div>
      </div>

      {lists.length > 1 && (
        <div className="no-print mb-4 flex flex-wrap gap-2">
          {lists.map((l, i) => (
            <Button
              key={i}
              variant={i === listIndex ? "primary" : "ghost"}
              onClick={() => setShop({ listIndex: i })}
            >
              {l.label}
            </Button>
          ))}
        </div>
      )}

      {list.shopIndex > 0 && (
        <p className="mb-4 rounded-xl border border-sage bg-sage-tint px-4 py-3 text-sm text-ink">
          A small top-up for the meals you make fresh in week two. Buying these on prep day just
          means throwing half of them away.
        </p>
      )}

      <label className="no-print mb-4 flex min-h-[2.75rem] cursor-pointer items-center gap-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={hideStaples}
          onChange={(e) => setShop({ hideStaples: e.target.checked })}
          className="h-6 w-6 shrink-0 accent-blush-deep"
        />
        Hide {hiddenCount > 0 ? hiddenCount : ""} cupboard staple
        {hiddenCount === 1 ? "" : "s"} — check you still have them
      </label>

      {(() => {
        const noted = list.lines.filter((l) => swaps[l.item]).length;
        return noted > 0 ? (
          <p className="mb-4 rounded-xl border border-sage bg-sage-tint px-4 py-3 text-sm text-ink">
            {noted} note{noted === 1 ? "" : "s"} on this list — they show up against the recipes
            that use those ingredients on the{" "}
            <Link href="/prep" className="underline underline-offset-2">
              prep sheet
            </Link>
            .
          </p>
        ) : null;
      })()}

      {/* Progress — a tired parent should see where they are without counting. */}
      {visible.length > 0 && (
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-sage-tint" aria-hidden="true">
          <div
            className="h-full rounded-full bg-blush-deep motion-safe:transition-[width] motion-safe:duration-200"
            style={{ width: `${(doneCount / visible.length) * 100}%` }}
          />
        </div>
      )}

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.aisle}>
            <h2 className="sticky top-0 z-10 -mx-4 bg-cream/95 px-4 py-2 text-sm font-semibold text-ink-muted backdrop-blur-sm sm:mx-0 sm:px-0">
              {AISLE_LABELS[group.aisle]}
            </h2>
            <Card className="p-0">
              <ul className="divide-y divide-sage-tint">
                {group.lines.map((line) => {
                  const key = `${list.shopIndex}:${line.item}`;
                  const done = ticked.has(key);
                  return (
                    <li key={line.item} className="scroll-mt-16">
                      <div className="flex items-start">
                        <label className="flex min-h-[3rem] flex-1 cursor-pointer items-start gap-3 py-3 pl-4">
                          <input
                            type="checkbox"
                            checked={done}
                            onChange={() => toggleTicked(key)}
                            className="mt-0.5 h-6 w-6 shrink-0 accent-blush-deep"
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block text-[15px] leading-snug ${
                                done ? "text-ink-muted line-through" : "text-ink"
                              }`}
                            >
                              {formatLine(line)}
                            </span>
                            {/* One muted line carries everything secondary: what
                                it is for, and whatever happened at the shop. */}
                            <span className="mt-0.5 block text-xs text-ink-muted">
                              {line.usedIn.length > 0 &&
                                `Used in ${line.usedIn.length} recipe${line.usedIn.length === 1 ? "" : "s"}`}
                              {swaps[line.item] && (
                                <span className="text-alert">
                                  {line.usedIn.length > 0 ? " · " : ""}
                                  {swaps[line.item]}
                                </span>
                              )}
                            </span>
                            {line.note && <span className="mt-0.5 block text-xs text-alert">{line.note}</span>}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => setExpanded(expanded === key ? null : key)}
                          aria-expanded={expanded === key}
                          aria-label={`Details and notes for ${line.item}`}
                          className="flex min-h-[3rem] w-12 shrink-0 items-center justify-center self-stretch text-ink-muted hover:text-ink"
                        >
                          <Chevron open={expanded === key} />
                        </button>
                      </div>

                      {expanded === key && (
                        <div className="space-y-2 px-4 pb-3">
                          {line.usedIn.length > 0 && (
                            <ul className="space-y-0.5">
                              {line.usedIn.map((title) => (
                                <li key={title} className="text-xs text-ink">
                                  {title}
                                </li>
                              ))}
                            </ul>
                          )}
                          <SwapNote
                            item={line.item}
                            note={swaps[line.item]}
                            onChange={(text) => setSwap(line.item, text)}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))}
      </div>

    </div>
  );
}
