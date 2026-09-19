"use client";

import { usePlan } from "@/components/PlanProvider";
import { getRecipe } from "@/lib/data/recipes";
import { Badge, Card, SectionHeading, EmptyState } from "@/components/ui";
import { WarningList, LegumeBar, StaleBar } from "@/components/LegumeBanner";
import { cubesPerPortion } from "@/lib/planner/portions";

const WAVE_TIMING = ["morning — fill the trays", "afternoon", "overnight", "next morning"];

export default function PrepPage() {
  const { plan, ready } = usePlan();

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
        return (
          <div key={session.index} className="mb-8">
            <h3 className="mb-1 text-lg font-semibold text-ink">
              {plan.prepSessions.length > 1 ? `Prep session ${session.index + 1}` : "Prep day"}
              <span className="ml-2 text-sm font-normal text-ink-muted">
                day {session.dayIndex + 1}, covering days {session.coversDayIndices[0] + 1}–
                {session.coversDayIndices[session.coversDayIndices.length - 1] + 1}
              </span>
            </h3>
            <p className="mb-4 text-sm text-ink-muted">
              {session.cook.length} recipes · {totalCubes} cubes to freeze · {session.waves.length} freezing
              wave{session.waves.length === 1 ? "" : "s"}
            </p>

            <Card className="mb-4">
              <h4 className="mb-3 font-semibold text-ink">Cook</h4>
              <ul className="divide-y divide-sage-tint">
                {session.cook.map((item) => {
                  const r = getRecipe(item.recipeId);
                  return (
                    <li key={item.recipeId} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-ink">{r.title}</span>
                        <Badge tone="blush">
                          {item.batchMultiplier === 1 ? "Single batch" : `${item.batchMultiplier}× batch`}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        Makes about {item.portionsProduced} baby portions.
                        {item.toFridgePortions > 0 && ` ${item.toFridgePortions} to the fridge.`}
                        {item.toFreezerCubes > 0 && ` ${item.toFreezerCubes} cubes to the freezer.`}
                        {r.freezeFormat === "openFreeze" && " Freeze flat on a lined tray, then bag."}
                      </p>
                      {r.freezableNote && (
                        <p className="mt-0.5 text-xs text-alert">Only the {r.freezableNote} freezes.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>

            {session.cookFresh.length > 0 && (
              <Card className="mb-4">
                <h4 className="mb-1 font-semibold text-ink">Make fresh on the day</h4>
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
                          {" "}— day{item.dayIndices.length > 1 ? "s" : ""}{" "}
                          {item.dayIndices.map((d) => d + 1).join(", ")}
                          {r.activeMinutes ? ` · about ${r.activeMinutes} min` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            )}

            {session.waves.length > 1 && (
              <p className="mb-3 text-sm text-ink-muted">
                {session.waves.length} waves — the trays are the bottleneck, not the cooking.
                Cook everything on prep day and keep what is waiting in the fridge; the later
                waves can run overnight while you sleep.
              </p>
            )}

            {session.waves.map((wave) => (
              <Card key={wave.waveNumber} tone="sage" className="mb-3">
                <h4 className="mb-2 font-semibold text-ink">
                  Wave {wave.waveNumber}
                  <span className="ml-2 text-sm font-normal text-ink-muted">
                    {WAVE_TIMING[Math.min(wave.waveNumber - 1, WAVE_TIMING.length - 1)]}
                    {wave.waveNumber > 1 && ` · pop wave ${wave.waveNumber - 1} into labelled bags first`}
                    {" · "}freeze {freezer.freezeHours} hours
                  </span>
                </h4>
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
                  {wave.openFreezeRecipeIds.map((id) => (
                    <li key={id} className="text-sm text-ink">
                      <strong>Baking tray</strong> — {getRecipe(id).title}
                      <span className="text-ink-muted"> (freeze flat, then bag)</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}

            <Card tone="blush">
              <h4 className="mb-2 font-semibold text-ink">Bag labels</h4>
              <p className="mb-3 text-xs text-ink">
                One recipe per bag. Cubes from different recipes are indistinguishable once frozen,
                and guessing is how a legume-free plan stops being legume-free.
              </p>
              <ul className="space-y-2">
                {session.cook
                  .filter((c) => c.toFreezerCubes > 0 || getRecipe(c.recipeId).freezeFormat === "openFreeze")
                  .map((c) => {
                    const r = getRecipe(c.recipeId);
                    return (
                      <li key={c.recipeId} className="border-t border-blush/40 pt-2 text-sm text-ink first:border-0 first:pt-0">
                        <strong>{r.title}</strong>
                        {r.freezeFormat === "cube"
                          ? ` · ${c.toFreezerCubes} cubes · ${perPortion} cubes = 1 portion`
                          : ` · about ${c.portionsProduced} baby portions`}
                        {" · frozen "}
                        {new Date().toLocaleDateString("en-GB")}
                        {" · use by "}
                        {new Date(Date.now() + 30 * 864e5).toLocaleDateString("en-GB")}
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
        <h3 className="mb-2 font-semibold text-ink">Freezer rules</h3>
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
