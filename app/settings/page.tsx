"use client";

import { usePlan } from "@/components/PlanProvider";
import { useState } from "react";
import { Button, Card, SectionHeading, Segmented } from "@/components/ui";
import { PlanSetup } from "@/components/PlanSetup";
import { StaleBar } from "@/components/LegumeBanner";
import { LEGUME_TERMS } from "@/lib/data/legumes";
import { clear, clearPlan } from "@/lib/storage/local";
import { cubesPerPortion, cubesPerWave } from "@/lib/planner/portions";
import { PLANNABLE_RECIPES } from "@/lib/data/recipes";

/**
 * The bands the recipe library actually distinguishes. 9 is here because it is
 * the default: the control used to offer 6/7/10/12 against a stored value of 9,
 * so every option rendered unselected and the screen whose job is to state what
 * the plan assumes about the babies stated nothing.
 */
const AGE_BANDS = [6, 7, 9, 10, 12];

/**
 * What changes at each band, in a line.
 *
 * The band used to only filter the recipe pool, which made it a setting about
 * the app rather than about the baby. NHS guidance for these months is mostly
 * about texture — move on to mashed and lumpier food as soon as they can
 * manage it — and the app was silent on the one thing it most wants to say.
 */
const AGE_BAND_NOTE: Record<number, string> = {
  6: "Smooth or soft-mashed, a teaspoon or two at a time, and soft things to hold. Move on to lumps as soon as they can manage them.",
  7: "Mashed and lumpier food, and more to pick up. Learning to chew is the skill for these months, and it is easier to teach now than later.",
  9: "Lumpy and chopped food, with finger foods at every meal. Working up to three meals a day.",
  10: "Chopped food and a wide range of textures — they should be picking most of it up themselves by now.",
  12: "The same meals as everyone else, chopped small, with no salt added to any of it.",
};

export default function SettingsPage() {
  const { settings, updateSettings, ready, regenerate, generating, plan } = usePlan();
  const [confirmClear, setConfirmClear] = useState<null | "plan" | "everything">(null);
  if (!ready) return <p className="text-ink-muted">Loading…</p>;

  const f = settings.freezer;
  const suitable = PLANNABLE_RECIPES.filter((r) => r.ageBandMonths <= settings.ageBandMonths);
  const availableRecipes = suitable.length;
  /**
   * Suitable recipes per meal, because the total hides the thing that breaks a
   * plan: at 6+ months the library has four recipes and every one is a
   * breakfast, so a lunch plan at that band comes out empty with no warning
   * until it has already been built.
   */
  const bySlot = (["breakfast", "lunch"] as const).map((slot) => ({
    slot,
    count: suitable.filter((r) => r.slots.includes(slot)).length,
    planned: settings.slots.includes(slot),
  }));
  const emptyPlanned = bySlot.filter((s) => s.planned && s.count === 0);
  const slotWord = (slot: "breakfast" | "lunch", n: number) =>
    n === 1 ? slot : slot === "lunch" ? "lunches" : "breakfasts";

  function setFreezer(patch: Partial<typeof f>) {
    updateSettings({ freezer: { ...f, ...patch } });
  }

  return (
    <div className="space-y-6">
      <SectionHeading sub="Changes here do not alter the current plan until you rebuild it.">
        Settings
      </SectionHeading>

      <StaleBar />

      <div>
        <h2 className="mb-3 font-semibold text-ink">Plan size</h2>
        <PlanSetup />
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Freezer kit</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm text-ink-muted">Trays</span>
            <input
              name="trayCount" inputMode="numeric" type="number" autoComplete="off" min={1} max={20} value={f.trayCount}
              onChange={(e) => setFreezer({ trayCount: Math.max(1, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">Cubes per tray</span>
            <input
              name="cubesPerTray" inputMode="numeric" type="number" autoComplete="off" min={1} max={30} value={f.cubesPerTray}
              onChange={(e) => setFreezer({ cubesPerTray: Math.max(1, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">Cube volume (ml)</span>
            <input
              name="cubeVolumeMl" inputMode="numeric" type="number" autoComplete="off" min={5} max={120} step={5} value={f.cubeVolumeMl}
              onChange={(e) => setFreezer({ cubeVolumeMl: Math.max(5, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">Hours to freeze solid</span>
            <input
              name="freezeHours" inputMode="numeric" type="number" autoComplete="off" min={1} max={24} value={f.freezeHours}
              onChange={(e) => setFreezer({ freezeHours: Math.max(1, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">Freezer capacity (cubes)</span>
            <input
              name="freezerCapacityCubes" inputMode="numeric" type="number" autoComplete="off" min={10} max={1000} step={10} value={f.freezerCapacityCubes}
              onChange={(e) => setFreezer({ freezerCapacityCubes: Math.max(10, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
        </div>
        <p className="mt-3 text-sm text-ink-muted">
          {cubesPerWave(f)} cubes per freezing wave · {cubesPerPortion(f)} cubes = 1 baby portion ·{" "}
          {cubesPerPortion(f) * settings.eaters} cubes = one meal for both twins.
        </p>
        <p className="mt-1 text-xs text-ink-muted">
          Worth timing how long a cube actually takes to set solid on your first prep day — if it is
          faster than {f.freezeHours} hours, both waves fit in a morning.
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold text-ink">Age band</h2>
        <Segmented
          label="Age band"
          value={String(settings.ageBandMonths)}
          options={AGE_BANDS.map((m) => ({ value: String(m), label: `${m}+ months` }))}
          onChange={(v) => updateSettings({ ageBandMonths: Number(v) })}
        />
        <p className="mt-2 text-sm text-ink-muted">
          {availableRecipes} of {PLANNABLE_RECIPES.length} recipes are suitable at{" "}
          {settings.ageBandMonths}+ months —{" "}
          {bySlot
            .map((s) => `${s.count === 0 ? "no" : s.count} ${slotWord(s.slot, s.count)}`)
            .join(" and ")}
          . Every recipe carries a minimum age, so a lower band narrows the pool rather than
          widening it.
        </p>
        <p className="mt-2 text-sm text-ink">{AGE_BAND_NOTE[settings.ageBandMonths]}</p>
        {emptyPlanned.length > 0 && (
          <p className="mt-2 text-sm text-alert">
            Your plan asks for{" "}
            {emptyPlanned.map((s) => slotWord(s.slot, 2)).join(" and ")}, and the library has none
            at this age band. Rebuilding now would produce a plan of empty days.
          </p>
        )}
      </Card>

      {plan && (
        <Card tone="blush">
          <h2 className="mb-2 font-semibold text-ink">Apply your changes</h2>
          <p className="mb-3 text-sm text-ink">
            The current plan keeps its old settings until you rebuild it. Rebuilding keeps any meals
            you have locked.
          </p>
          <Button onClick={() => regenerate()} disabled={generating} busy={generating}>
            {generating ? "Rebuilding…" : "Rebuild the plan"}
          </Button>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-semibold text-ink">Safety — 6 to 9 months</h2>
        <ul className="space-y-1 text-sm text-ink-muted">
          <li><strong className="text-ink">No honey</strong> before 12 months — risk of infant botulism.</li>
          <li><strong className="text-ink">No added salt.</strong> Use homemade or low-sodium stock. Recipes with two salty components are badged &ldquo;saltier&rdquo; and never scheduled on the same day.</li>
          <li><strong className="text-ink">No added sugar.</strong></li>
          <li><strong className="text-ink">No whole nuts</strong> before 5 years. Ground nuts and smooth nut butters are fine, and several recipes use them.</li>
          <li><strong className="text-ink">Cow&rsquo;s milk</strong> is fine in cooking from 6 months, but not as a main drink before 12 months.</li>
          <li><strong className="text-ink">Choking:</strong> quarter grapes and cherry tomatoes lengthways — halved is not enough; crush or chop sweetcorn kernels; cook carrot until it crushes easily, never raw; nuts ground or as smooth butter, never whole, until five. Cut food into finger-sized strips and keep them sitting upright. Each recipe repeats this against the ingredient it applies to.</li>
          <li><strong className="text-ink">Eggs</strong> must be cooked through unless British Lion stamped.</li>
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          This is general guidance, not medical advice. A suspected food reaction should be
          reviewed with a GP or dietitian — excluding a whole food group from an infant&rsquo;s diet is
          worth doing with clinical support.
        </p>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-ink">What counts as a legume</h2>
        <p className="mb-2 text-sm text-ink-muted">
          Strict botanical exclusion — every member of the family Fabaceae, including peanuts and soya,
          which are commonly not thought of as legumes at all. {LEGUME_TERMS.length} terms are matched:
        </p>
        <p className="text-xs leading-relaxed text-ink-muted">{LEGUME_TERMS.join(" · ")}</p>
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-ink">Data</h2>
        <p className="mb-3 text-sm text-ink-muted">
          Everything is stored in this browser only — the plan, your ticks, your saved recipes and
          your notes. None of it appears on another phone, and clearing site data loses it. Use the
          Share buttons on the Plan, Today, Shop, Prep and Recipes tabs to send things to the
          other parent, or to yourself.
        </p>
        {confirmClear === "plan" && (
          <div className="rounded-lg border border-alert/40 bg-alert-tint p-3">
            <p className="text-sm text-ink">
              This deletes the current plan, your shopping ticks, your prep-day ticks and the
              record of which allergens the twins have tried. Your saved recipes and the notes
              you have written against them are kept.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  clearPlan();
                  window.location.href = "/";
                }}
              >
                Yes, clear the plan
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(null)}>
                Keep it
              </Button>
            </div>
          </div>
        )}

        {confirmClear === "everything" && (
          <div className="rounded-lg border border-alert/40 bg-alert-tint p-3">
            <p className="text-sm text-ink">
              This deletes <strong>everything</strong> — the plan, your ticks, the allergen record,
              and every saved recipe and note. Those notes took weeks to build up and cannot be
              recovered. Copy your saved list from the Recipes tab first if you want to keep it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  clear();
                  window.location.href = "/";
                }}
              >
                Yes, delete everything
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(null)}>
                Keep it
              </Button>
            </div>
          </div>
        )}

        {confirmClear === null && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setConfirmClear("plan")}>
              Clear the plan
            </Button>
            <Button variant="ghost" onClick={() => setConfirmClear("everything")}>
              Delete everything
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
