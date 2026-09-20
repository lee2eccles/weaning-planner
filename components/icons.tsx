/**
 * The icon set.
 *
 * Drawn rather than borrowed from the character set: a star glyph and an arrow
 * glyph render in whatever the system font decides, at whatever weight it
 * decides, which is not a design decision anyone here made. These are one
 * stroke weight (1.75), one corner treatment, one size unit, and they inherit
 * `currentColor` so every surface tints them correctly.
 *
 * All are decorative — every caller gives the control its own accessible name.
 */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Svg({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

const STAR_PATH = "M10 2.6l2.3 4.66 5.15.75-3.73 3.63.88 5.13L10 14.35l-4.6 2.42.88-5.13L2.55 8.01l5.15-.75z";

export function Star({ filled = false }: { filled?: boolean }) {
  return (
    <Svg>
      <path d={STAR_PATH} {...stroke} fill={filled ? "currentColor" : "none"} />
    </Svg>
  );
}

export function Chevron({ open = false }: { open?: boolean }) {
  return (
    <Svg className={open ? "rotate-180 motion-safe:transition-transform" : "motion-safe:transition-transform"}>
      <path d="M5.5 8l4.5 4.5L14.5 8" {...stroke} />
    </Svg>
  );
}

export function ArrowRight() {
  return (
    <Svg>
      <path d="M3.5 10h13M11.5 5l5 5-5 5" {...stroke} />
    </Svg>
  );
}

export function Minus() {
  return (
    <Svg>
      <path d="M4.5 10h11" {...stroke} />
    </Svg>
  );
}

export function Plus() {
  return (
    <Svg>
      <path d="M10 4.5v11M4.5 10h11" {...stroke} />
    </Svg>
  );
}

export function Check() {
  return (
    <Svg>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" {...stroke} />
    </Svg>
  );
}
