"use client";

import { useMemo, useState } from "react";
import { usePlan } from "@/components/PlanProvider";
import { buildShoppingLists, shoppingListToText, formatLine } from "@/lib/shopping/merge";
import { Button, Card, CopyButton, SectionHeading, EmptyState } from "@/components/ui";
import { LegumeBar, StaleBar } from "@/components/LegumeBanner";
import { AISLE_LABELS, type Aisle } from "@/lib/types";

export default function ShopPage() {
  const { plan, ready, ticked, toggleTicked } = usePlan();
  const [hideStaples, setHideStaples] = useState(true);
  const [listIndex, setListIndex] = useState(0);

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
          sub={`Days ${list.coversDays[0] + 1}–${list.coversDays[1] + 1} · ${doneCount} of ${visible.length} in the trolley${
            hiddenCount > 0 ? ` · ${hiddenCount} staples hidden` : ""
          }`}
        >
          {list.label}
        </SectionHeading>
        <div className="no-print">
          <CopyButton text={shoppingListToText(list, !hideStaples)} label="Copy list" />
        </div>
      </div>

      {lists.length > 1 && (
        <div className="no-print mb-4 flex flex-wrap gap-2">
          {lists.map((l, i) => (
            <Button key={i} variant={i === listIndex ? "primary" : "ghost"} onClick={() => setListIndex(i)}>
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
                    <li key={line.item}>
                      <label
                        className={`flex min-h-[3rem] cursor-pointer items-start gap-3 px-4 py-3 ${
                          done ? "opacity-45" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggleTicked(key)}
                          className="mt-0.5 h-6 w-6 shrink-0 accent-blush-deep"
                        />
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block text-[15px] leading-snug text-ink ${
                              done ? "line-through" : ""
                            }`}
                          >
                            {formatLine(line)}
                          </span>
                          {line.note && <span className="mt-0.5 block text-xs text-alert">{line.note}</span>}
                          {line.usedIn.length > 1 && (
                            <span className="mt-0.5 block text-xs text-ink-muted">
                              Used in {line.usedIn.length} recipes
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))}
      </div>

      <label className="no-print mt-5 flex min-h-[2.75rem] cursor-pointer items-center gap-3 text-sm text-ink-muted">
        <input
          type="checkbox"
          checked={hideStaples}
          onChange={(e) => setHideStaples(e.target.checked)}
          className="h-6 w-6 shrink-0 accent-blush-deep"
        />
        Hide cupboard staples — check you still have them
      </label>
    </div>
  );
}
