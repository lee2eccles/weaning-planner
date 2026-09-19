"use client";

import Link from "next/link";
import { usePlan } from "./PlanProvider";
import { Badge } from "./ui";

/**
 * The legume exclusion is absolute, so it has to be legible on every screen —
 * not just the one you happened to start on. A grandparent handed the phone on
 * the Today tab, or a parent improvising a substitute in front of an empty
 * shelf on the Shop tab, needs to see it there.
 */
export function LegumeBar() {
  return (
    <p className="mb-4 rounded-lg bg-sage-tint px-3 py-2 text-xs leading-relaxed text-ink">
      <strong className="font-semibold">Legume-free.</strong> No beans, lentils, chickpeas, peas,
      green beans, peanuts or soya.
    </p>
  );
}

/** The fuller version, for the screen where a plan is created. */
export function LegumeBanner() {
  return (
    <div className="mb-6 rounded-xl border border-sage bg-sage-tint px-4 py-3">
      <p className="text-sm font-medium text-ink">
        Every meal here is legume-free — no beans, lentils, chickpeas, peas, green beans,
        peanuts or soya.
      </p>
      <p className="mt-1 text-xs text-ink-muted">
        Legumes are excluded entirely. Other allergens are labelled, not removed.
      </p>
    </div>
  );
}

/**
 * Settings that no longer match the plan. Without this, you tick Breakfast,
 * see no change, and conclude the app ignored you.
 */
export function StaleBar() {
  const { planIsStale, settings, plan, regenerate, generating } = usePlan();
  if (!planIsStale || !plan) return null;

  const was = plan.settings.slots.join(" and ");
  const now = settings.slots.join(" and ");
  const changed =
    was !== now
      ? `for ${was}, but you have since selected ${now}`
      : `with different settings to the ones now selected`;

  return (
    <div className="mb-4 rounded-xl border border-blush bg-blush-tint px-4 py-3">
      <p className="text-sm text-ink">
        This plan was built {changed}.
      </p>
      <button
        onClick={() => regenerate()}
        disabled={generating}
        className="mt-2 inline-flex min-h-[2.75rem] items-center rounded-lg bg-blush px-4 py-2.5 text-sm font-medium text-ink hover:bg-blush-deep disabled:opacity-50"
      >
        {generating ? "Rebuilding…" : "Rebuild the plan"}
      </button>
    </div>
  );
}

export function WarningList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="mb-6 rounded-xl border border-alert/30 bg-alert-tint px-4 py-3">
      <p className="mb-2 text-sm font-semibold text-alert">Worth knowing</p>
      <ul className="space-y-1">
        {warnings.map((w, i) => (
          <li key={i} className="text-sm text-ink">
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NewAllergenNote() {
  return (
    <p className="mt-4 text-xs leading-relaxed text-ink-muted">
      A <Badge tone="blush">new</Badge> allergen badge means the twins have not been offered it
      before. Introduce one at a time, on a day you are around to watch. Tick a meal as eaten on{" "}
      <Link href="/today" className="underline underline-offset-2">
        Today
      </Link>{" "}
      to record it.
    </p>
  );
}
