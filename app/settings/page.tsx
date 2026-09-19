"use client";

import { usePlan } from "@/components/PlanProvider";
import { useState } from "react";
import { Button, Card, SectionHeading } from "@/components/ui";
import { StaleBar } from "@/components/LegumeBanner";
import { LEGUME_TERMS } from "@/lib/data/legumes";
import { clear } from "@/lib/storage/local";
import { cubesPerPortion, cubesPerWave } from "@/lib/planner/portions";
import type { MealSlot } from "@/lib/types";

export default function SettingsPage() {
  const { settings, updateSettings, ready, regenerate, generating, plan } = usePlan();
  const [confirmClear, setConfirmClear] = useState(false);
  if (!ready) return <p className="text-ink-muted">Loading…</p>;

  const f = settings.freezer;

  function setFreezer(patch: Partial<typeof f>) {
    updateSettings({ freezer: { ...f, ...patch } });
  }

  return (
    <div className="space-y-6">
      <SectionHeading sub="Changes here do not alter the current plan until you rebuild it.">
        Settings
      </SectionHeading>

      <StaleBar />

      <Card>
        <h3 className="mb-3 font-semibold text-ink">Freezer kit</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm text-ink-muted">Trays</span>
            <input
              name="trayCount" inputMode="numeric" type="number" min={1} max={20} value={f.trayCount}
              onChange={(e) => setFreezer({ trayCount: Math.max(1, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">Cubes per tray</span>
            <input
              name="cubesPerTray" inputMode="numeric" type="number" min={1} max={30} value={f.cubesPerTray}
              onChange={(e) => setFreezer({ cubesPerTray: Math.max(1, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">Cube volume (ml)</span>
            <input
              name="cubeVolumeMl" inputMode="numeric" type="number" min={5} max={120} step={5} value={f.cubeVolumeMl}
              onChange={(e) => setFreezer({ cubeVolumeMl: Math.max(5, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">Hours to freeze solid</span>
            <input
              name="freezeHours" inputMode="numeric" type="number" min={1} max={24} value={f.freezeHours}
              onChange={(e) => setFreezer({ freezeHours: Math.max(1, +e.target.value) })}
              className="mt-1 min-h-[2.75rem] w-full rounded-lg border border-sage bg-white px-3 py-2 text-ink tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">Freezer capacity (cubes)</span>
            <input
              name="freezerCapacityCubes" inputMode="numeric" type="number" min={10} max={1000} step={10} value={f.freezerCapacityCubes}
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
        <h3 className="mb-3 font-semibold text-ink">Which meals to plan</h3>
        <div className="space-y-2">
          {(["breakfast", "lunch"] as MealSlot[]).map((slot) => {
            const on = settings.slots.includes(slot);
            return (
              <label key={slot} className="flex min-h-[2.75rem] cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => {
                    const next = on
                      ? settings.slots.filter((s) => s !== slot)
                      : ([...settings.slots, slot] as MealSlot[]);
                    // Planning nothing is not a useful state.
                    if (next.length === 0) return;
                    updateSettings({
                      slots: (["breakfast", "lunch"] as MealSlot[]).filter((s) => next.includes(s)),
                    });
                  }}
                  className="mt-1 h-6 w-6 shrink-0 accent-blush-deep"
                />
                <span>
                  <span className="font-medium capitalize text-ink">{slot}</span>
                  <span className="block text-sm text-ink-muted">
                    {slot === "breakfast"
                      ? "Turn this on when you move off porridge — it adds 13 breakfast recipes and roughly doubles the shopping."
                      : "Lunches only, which is what you are doing now."}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-muted">At least one meal must stay selected.</p>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold text-ink">Age band</h3>
        <div className="flex flex-wrap gap-2">
          {[6, 7, 10, 12].map((m) => (
            <Button
              key={m}
              variant={settings.ageBandMonths === m ? "primary" : "ghost"}
              onClick={() => updateSettings({ ageBandMonths: m })}
            >
              {m}+ months
            </Button>
          ))}
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          Recipes carry a minimum age, so raising this widens the pool. Moving up a band would mean
          writing more recipes for it.
        </p>
      </Card>

      {plan && (
        <Card tone="blush">
          <h3 className="mb-2 font-semibold text-ink">Apply your changes</h3>
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
        <h3 className="mb-2 font-semibold text-ink">Safety — 6 to 9 months</h3>
        <ul className="space-y-1 text-sm text-ink-muted">
          <li><strong className="text-ink">No honey</strong> before 12 months — risk of infant botulism.</li>
          <li><strong className="text-ink">No added salt.</strong> Use homemade or low-sodium stock. Recipes with two salty components are badged &ldquo;saltier&rdquo; and never scheduled on the same day.</li>
          <li><strong className="text-ink">No added sugar.</strong></li>
          <li><strong className="text-ink">No whole nuts</strong> before 5 years. Ground nuts and smooth nut butters are fine, and several recipes use them.</li>
          <li><strong className="text-ink">Cow&rsquo;s milk</strong> is fine in cooking from 6 months, but not as a main drink before 12 months.</li>
          <li><strong className="text-ink">Choking:</strong> quarter grapes and cherry tomatoes lengthways; cut food into finger-sized strips; nothing round and firm.</li>
          <li><strong className="text-ink">Eggs</strong> must be cooked through unless British Lion stamped.</li>
        </ul>
        <p className="mt-3 text-xs text-ink-muted">
          This is general guidance, not medical advice. A suspected food reaction should be
          reviewed with a GP or dietitian — excluding a whole food group from an infant&rsquo;s diet is
          worth doing with clinical support.
        </p>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold text-ink">What counts as a legume</h3>
        <p className="mb-2 text-sm text-ink-muted">
          Strict botanical exclusion — every member of the family Fabaceae, including peanuts and soya,
          which are commonly not thought of as legumes at all. {LEGUME_TERMS.length} terms are matched:
        </p>
        <p className="text-xs leading-relaxed text-ink-muted">{LEGUME_TERMS.join(" · ")}</p>
      </Card>

      <Card>
        <h3 className="mb-2 font-semibold text-ink">Data</h3>
        <p className="mb-3 text-sm text-ink-muted">
          Everything is stored in this browser only. It will not appear on another phone, and clearing
          site data loses it. Use Copy on the Plan and Shop tabs to share.
        </p>
        {confirmClear ? (
          <div className="rounded-lg border border-alert/40 bg-alert-tint p-3">
            <p className="text-sm text-ink">
              This deletes the current plan, your shopping ticks and the record of which allergens
              the twins have tried. It cannot be undone.
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
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>
                Keep it
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmClear(true)}>
            Clear saved plan
          </Button>
        )}
      </Card>
    </div>
  );
}
