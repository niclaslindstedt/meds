// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// App-owned glyphs — the marks the framework's set has no vocabulary for
// because they are this app's domain: a capsule for a medication, a flame for
// a streak, a chart for history. Everything else (calendar, cog, check,
// chevrons, cloud) comes from `@niclaslindstedt/oss-framework/components`, so
// the two sets only ever differ where the domain does.
//
// Traced on the same Lucide 24×24 grid at the same 2px stroke weight as the
// framework glyphs, and stroked with `currentColor`, so a mark from either
// set sits on the same line without retuning.

import type { ReactNode } from "react";

export type IconProps = { className?: string };

function Glyph({
  className,
  filled = false,
  children,
}: IconProps & { filled?: boolean; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/**
 * The app mark — the same seamed capsule that is the favicon and the install
 * icon, drawn in `currentColor` on nothing.
 *
 * The two differences from `public/icons/icon.svg` are the whole point of it
 * existing. That file paints the mark green on the dark install surface,
 * because an icon's job is to be found on a home screen next to its sibling
 * apps and it has to carry its own background to do that. This one drops the
 * background rect and swaps the ink for `currentColor`, so inside the app the
 * mark is whatever the element around it is — which is the accent in the top
 * bar, this app's teal. The mark is one shape in two liveries rather than two
 * marks.
 *
 * Its own viewBox, not the 24×24 grid the glyphs below are traced on. This is
 * a logo and not a UI glyph: its stroke is 26 on a 100 box, because the seam
 * has to survive 16px in a browser tab. The seam is a *hole* here rather than
 * the drawn line the icon file uses — this mark sits on no background, so the
 * cut is a mask that lets whatever is behind it show through.
 *
 * Geometry is copied from `public/icons/icon.svg` and mirrored a second time
 * into `scripts/generate-icons.mjs`, which rasterises it. All three are kept
 * in step by hand — change one, change the other two.
 */
export function AppMarkIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <mask id="app-mark-seam">
        <path
          d="M27 73 L73 27"
          stroke="#fff"
          strokeWidth={26}
          strokeLinecap="round"
        />
        <path d="M39.4 39.4 L60.6 60.6" stroke="#000" strokeWidth={8} />
      </mask>
      <rect
        width="100"
        height="100"
        fill="currentColor"
        mask="url(#app-mark-seam)"
      />
    </svg>
  );
}

/** A medication — a capsule with its seam, tilted the way capsules are
 *  drawn everywhere. The outline form for controls and list rows. */
export function PillIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <rect
        x="8.5"
        y="1.5"
        width="7"
        height="21"
        rx="3.5"
        transform="rotate(45 12 12)"
      />
      <path d="m9.5 9.5 5 5" />
    </Glyph>
  );
}

/** A dose slot — the framework has no clock glyph of its own. */
export function ClockIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Glyph>
  );
}

/** History — a bar chart. */
export function ChartIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M3 21h18" />
      <path d="M7 21V10" />
      <path d="M12 21V4" />
      <path d="M17 21v-7" />
    </Glyph>
  );
}

/** A streak — the flame every habit surface has taught to mean "days in a
 *  row". Filled variant for the stat tile where the outline reads thin. */
export function FlameIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <path d="M12 2.5c1 3-1.5 4.5-1.5 7a3 3 0 0 0 6 .5c1.5 1.5 2.5 3.4 2.5 5.5a7 7 0 1 1-14 0c0-5 4.5-7.5 7-13Z" />
    </Glyph>
  );
}

/** A dose still standing — the hollow circle a taken dose's check fills. */
export function CircleIcon({ className }: IconProps) {
  return (
    <Glyph className={className}>
      <circle cx="12" cy="12" r="9" />
    </Glyph>
  );
}
