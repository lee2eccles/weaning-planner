"use client";

import { usePlan } from "@/components/PlanProvider";
import { getRecipe } from "@/lib/data/recipes";
import { Card, SectionHeading, ShareButton, EmptyState } from "@/components/ui";
import { CookRow } from "@/components/CookRow";
import { WarningList, LegumeBar, StaleBar } from "@/components/LegumeBanner";
import { cubesPerPortion } from "@/lib/planner/portions";
import type { PrepSession } from "@/lib/types";
import type { WavePlacement } from "@/components/CookRow";
import { prepSessionToText } from "@/lib/text/export";

const WAVE_TIMING = ["morning — fill the trays", "afternoon", "overnight", "next morning"];

/**
 * Which freezing wave each recipe belongs to, and which trays it fills.
 *
 * The cook list used to be in solver order while the waves were a thousand
 * pixels further down, so "which three go in first" had to be held in the head
 * for three and a half hours — exactly the load this sheet exists to remove.
 */
function waveIndex(session: PrepSession): Map<string, WavePlacement> {
  const index = new Map<string, WavePlacement>();
  for (const wave of session.waves) {
    for (const tray of wave.trays) {
      const entry: WavePlacement =
        index.get(tray.recipeId) ?? { waves: [], traysByWave: new Map<number, number[]>() };
      if (!entry.waves.includes(wave.waveNumber)) entry.waves.push(wave.waveNumber);
      const trays = entry.traysByWave.get(wave.waveNumber) ?? [];
      trays.push(tray.trayNumber);
      entry.traysByWave.set(wave.waveNumber, trays);
      index.set(tray.recipeId, entry);
    }
    for (const id of wave.openFreezeRecipeIds) {
      if (index.has(id)) continue;
      index.set(id, { waves: [wave.waveNumber], traysByWave: new Map<number, number[]>() });
    }
  }
  return index;
}

/** Hands-on minutes, scaled by batch — a 3× pan is not a 1× pan. */
function sessionMinutes(cook: { recipeId: string; batchMultiplier: number }[]): number {
  return Math.round(
    cook.reduce((n, c) => {
      const m = getRecipe(c.recipeId).activeMinutes;
      // A bigger batch is more chopping, not proportionally more cooking.
      return n + m * (1 + (c.batchMultiplier - 1) * 0.5);
    }, 0)
  );
}

function hoursAndMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} minutes`;
  if (m === 0) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${h} hour${h === 1 ? "" : "s"} ${m} minutes`;
}

export default function PrepPage() {
  const { plan, ready, cooked, toggleCooked, swaps, notes } = usePlan();

  if (!ready) return <p className="text-ink-muted">Loading…</p>;
  if (!plan) {
    return (
      <EmptyState
        title="No prep sheet yet"
        body="Once you make a plan, this becomes your cook-day sheet: what to batch-cook, what to make fresh on the day, which recipe fills which ice cube tray, and what to write on each bag."
      />
    );
  }

  const { freezer } = plan.settings;
  const perPortion = cubesPerPortion(freezer);

  return (
    <div>
      <LegumeBar />
      <StaleBar />
      <SectionHeading
        sub={`${freezer.trayCount} trays × ${freezer.cubesPerTray} cubes × ${freezer.cubeVolumeMl}ml — ${freezer.trayCount * freezer.cubesPerTray} cubes per wave. ${perPortion} cubes = 1 baby portion.`}
      >
        Prep sheet
      </SectionHeading>

      <WarningList warnings={plan.warnings} />

      {plan.prepSessions.map((session) => {
        const totalCubes = session.cook.reduce((n, c) => n + c.toFreezerCubes, 0);
        const waves = waveIndex(session);
        const cookInOrder = [...session.cook].sort((a, b) => {
          const wa = waves.get(a.recipeId)?.waves[0] ?? Infinity;
          const wb = waves.get(b.recipeId)?.waves[0] ?? Infinity;
          // Anything that freezes goes first, earliest wave first; fridge-only
          // dishes come last because nothing is waiting on them.
          return wa - wb || session.cook.indexOf(a) - session.cook.indexOf(b);
        });

        const flatPortions = session.cook.reduce((n, c) => n + c.toFreezerPortions, 0);
        const minutes = sessionMinutes(session.cook);
        const doneCount = session.cook.filter((c) =>
          cooked.has(`${session.index}:${c.recipeId}`)
        ).length;

        return (
          <div key={session.index} className="mb-8">
            <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-ink">
                {plan.prepSessions.length > 1 ? `Prep session ${session.index + 1}` : "Prep day"}
                <span className="ml-2 text-sm font-normal text-ink-muted">
                  day {session.dayIndex + 1}
                  {session.coversDayIndices.length > 1
                    ? `, covering days ${session.coversDayIndices[0] + 1}–${
                        session.coversDayIndices[session.coversDayIndices.length - 1] + 1
                      }`
                    : ""}
                </span>
              </h2>
              <div className="no-print">
                <ShareButton
                  text={prepSessionToText(
                    session,
                    getRecipe,
                    perPortion,
                    swaps,
                    new Set(
                      [...cooked]
                        .filter((k) => k.startsWith(`${session.index}:`))
                        .map((k) => k.slice(String(session.index).length + 1))
                    )
                  )}
                  title="Prep sheet"
                  label="Share prep sheet"
                />
              </div>
            </div>
            <p className="mb-4 text-sm tabular-nums text-ink-muted">
              {session.cook.length} recipe{session.cook.length === 1 ? "" : "s"} · about{" "}
              {hoursAndMinutes(minutes)} hands-on ·{" "}
              {totalCubes} cubes in trays
              {flatPortions > 0 && ` · ${flatPortions} portions frozen flat`} ·{" "}
              {session.waves.length} freezing wave{session.waves.length === 1 ? "" : "s"}
            </p>

            <Card className="mb-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold text-ink">Cook</h3>
                <p className="text-sm tabular-nums text-ink-muted" aria-live="polite">
                  {doneCount} of {session.cook.length} done
                </p>
              </div>
              {session.cook.length > 0 && (
                <div
                  className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-sage-tint"
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full bg-blush-deep motion-safe:transition-[width] motion-safe:duration-200"
                    style={{ width: `${(doneCount / session.cook.length) * 100}%` }}
                  />
                </div>
              )}
              <p className="mb-3 text-sm text-ink-muted">
                In this order: the freezer is the bottleneck, so whatever fills wave 1 goes in
                the pan first.
              </p>
              <ul className="divide-y divide-sage-tint">
                {cookInOrder.map((item, i) => (
                  <CookRow
                    key={item.recipeId}
                    item={item}
                    position={i + 1}
                    wave={waves.get(item.recipeId)}
                    cubesPerPortion={perPortion}
                    swaps={swaps}
                    note={notes[item.recipeId]}
                    cooked={cooked.has(`${session.index}:${item.recipeId}`)}
                    onToggleCooked={() => toggleCooked(`${session.index}:${item.recipeId}`)}
                  />
                ))}
              </ul>
            </Card>

            {session.waves.length > 1 && (
              <p className="mb-3 text-sm text-ink-muted">
                {session.waves.length} waves — the trays are the bottleneck, not the cooking.
                Cook everything on prep day and keep what is waiting in the fridge; the later
                waves can run overnight while you sleep.
              </p>
            )}

            {session.waves.map((wave) => (
              <Card key={wave.waveNumber} tone="sage" className="mb-3">
                <h3 className="mb-2 font-semibold text-ink">
                  Wave {wave.waveNumber}
                  <span className="ml-2 text-sm font-normal text-ink-muted">
                    {WAVE_TIMING[Math.min(wave.waveNumber - 1, WAVE_TIMING.length - 1)]}
                    {wave.waveNumber > 1 && ` · pop wave ${wave.waveNumber - 1} into labelled bags first`}
                    {" · "}freeze {freezer.freezeHours} hours
                  </span>
                </h3>
                <ul className="space-y-1.5">
                  {groupTrays(wave.trays).map((g, i) => (
                    <li key={i} className="text-sm tabular-nums text-ink">
                      <strong>
                        {g.trayNumbers.length === 1
                          ? `Tray ${g.trayNumbers[0]}`
                          : `Trays ${g.trayNumbers[0]}–${g.trayNumbers[g.trayNumbers.length - 1]}`}
                      </strong>{" "}
                      — {getRecipe(g.recipeId).title}
                      <span className="text-ink-muted">
                        {" "}({g.cubes} cubes
                        {g.trayNumbers.length > 1 ? `, ${g.perTray.join(" + ")}` : ""})
                      </span>
                    </li>
                  ))}
                  {wave.openFreezeRecipeIds.map((id, i) => (
                    <li key={id} className="text-sm text-ink">
                      <strong>
                        Baking tray{wave.openFreezeRecipeIds.length > 1 ? ` ${i + 1}` : ""}
                      </strong>{" "}
                      — {getRecipe(id).title}
                      <span className="text-ink-muted"> (freeze flat, then bag)</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}

            {session.cookFresh.length > 0 && (
              <Card className="mb-4">
                <h3 className="mb-1 font-semibold text-ink">Make fresh on the day</h3>
                <p className="mb-3 text-xs text-ink-muted">
                  Quick enough to make on the morning. Not batched, not frozen — buy the
                  ingredients, but leave these until the day.
                </p>
                <ul className="divide-y divide-sage-tint">
                  {session.cookFresh.map((item) => {
                    const r = getRecipe(item.recipeId);
                    return (
                      <li key={item.recipeId} className="py-2">
                        <span className="font-medium text-ink">{r.title}</span>
                        <span className="text-sm text-ink-muted">
                          {" "}— day{new Set(item.dayIndices).size > 1 ? "s" : ""}{" "}
                          {[...new Set(item.dayIndices)].map((d) => d + 1).join(", ")}
                          {r.activeMinutes ? ` · about ${r.activeMinutes} min` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            <Card tone="blush">
              <h3 className="mb-2 font-semibold text-ink">Bag labels</h3>
              <p className="mb-3 text-xs text-ink">
                One recipe per bag, and write today&rsquo;s date in the gap as you seal it. Cubes
                from different recipes are indistinguishable once frozen, and guessing is how a
                legume-free plan stops being legume-free.
              </p>
              <ul className="space-y-2">
                {session.cook
                  .filter((c) => c.toFreezerCubes > 0 || c.toFreezerPortions > 0)
                  .map((c) => {
                    const r = getRecipe(c.recipeId);
                    return (
                      <li key={c.recipeId} className="border-t border-blush/40 pt-2 text-sm text-ink first:border-0 first:pt-0">
                        <strong>{r.title}</strong>
                        {r.freezeFormat === "cube"
                          ? ` · ${c.toFreezerCubes} cubes · ${perPortion} cubes = 1 portion`
                          : ` · ${c.toFreezerPortions} portions, frozen flat`}
                        {" · use within 1 month · frozen on ___________"}
                        {r.allergens.length > 0 && ` · contains ${r.allergens.join(", ")}`}
                      </li>
                    );
                  })}
              </ul>
            </Card>
          </div>
        );
      })}

      <Card className="mt-6">
        <h2 className="mb-2 font-semibold text-ink">Freezer rules</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-muted marker:text-sage">
          <li>Cool food completely before freezing — never put warm food in a freezer.</li>
          <li>Freeze within 24 hours of cooking; use within 1 month.</li>
          <li>Defrost in the fridge overnight, never at room temperature.</li>
          <li>Reheat until piping hot all the way through, then cool before serving.</li>
          <li>Never refreeze anything that has been defrosted.</li>
          <li>Sterilise trays before first use and keep a set just for baby food.</li>
        </ul>
      </Card>
    </div>
  );
}

/** Consecutive trays holding the same recipe read better as a range. */
function groupTrays(trays: { trayNumber: number; recipeId: string; cubes: number }[]) {
  const groups: { recipeId: string; trayNumbers: number[]; cubes: number; perTray: number[] }[] = [];
  for (const t of trays) {
    const last = groups[groups.length - 1];
    if (last && last.recipeId === t.recipeId) {
      last.trayNumbers.push(t.trayNumber);
      last.cubes += t.cubes;
      last.perTray.push(t.cubes);
    } else {
      groups.push({ recipeId: t.recipeId, trayNumbers: [t.trayNumber], cubes: t.cubes, perTray: [t.cubes] });
    }
  }
  return groups;
}
