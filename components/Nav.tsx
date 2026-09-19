"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Plan" },
  { href: "/today", label: "Today" },
  { href: "/shop", label: "Shop" },
  { href: "/prep", label: "Prep" },
  { href: "/recipes", label: "Recipes" },
  { href: "/settings", label: "Settings" },
];

/** Tablet and desktop: persistent sidebar, first in the DOM and first visually. */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="no-print hidden w-56 shrink-0 border-r border-sage-tint bg-sage-tint/40 p-6 md:block">
      <div className="mb-8">
        <p className="text-lg font-semibold leading-tight text-ink">Weaning Planner</p>
        <p className="mt-1 text-xs text-ink-muted">Legume-free meal planning</p>
      </div>
      <nav aria-label="Main">
        <ul className="space-y-1">
          {LINKS.map((l) => {
            const active = pathname === l.href;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                    active ? "bg-blush text-ink" : "text-ink-muted hover:bg-sage-tint"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

/**
 * Phone: fixed bottom tab bar. Rendered AFTER the main content in the DOM so
 * that tab order follows the visual order — previously six tab presses landed
 * on the visually-bottom nav before reaching any content.
 */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-sage-tint bg-white md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <li key={l.href} className="flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[3rem] flex-col items-center justify-center px-1 text-xs font-medium ${
                  active ? "bg-blush-tint text-ink" : "text-ink-muted"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
