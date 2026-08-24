// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The one place a day's progress turns into a mark.
//
// The Calendar screen's month grid paints days, and the legend under it has
// to explain exactly the marks the grid draws — so the progress → tone
// mapping and the paint for each tone live here, and the legend is generated
// from the same table rather than hand-kept beside it.
//
// Unlike the sibling cycle app's spans, a day here is a fact on its own: what
// you took *that day*. Two adjacent full days are two cleared checklists, not
// one stretch of anything, so every mark is a circle and there is no run
// logic. What varies is the fill, and it is the app's one grammar rule,
// stated once and reused by the dose toggles and the top bar alike: **filled
// means it happened, hollow means it is still open, and the warning tint is a
// day that owed doses and got none.**
//
// The mark sits *behind* the day number rather than as a glyph under it. A
// mark below the digits costs a row of height in every cell and reads as a
// footnote; painting behind the number is the number itself saying what kind
// of day it is, which is what a calendar is for. It is drawn as an absolutely
// positioned sibling at a negative stack level, because the framework's
// `MonthGrid` owns the cell's markup and renders the app's `renderDay` output
// *after* the number — the negative z-index is what puts it underneath. The
// cell needs a stacking context of its own for that to stay local, which the
// stylesheet gives it (`.app-med-calendar`, see styles.css).

import type { DayKey } from "@niclaslindstedt/oss-framework/calendar";

import type { DayProgress } from "./schedule.ts";
import { useT } from "./i18n/index.ts";

/** How a day is painted. `none` draws nothing at all — a day with nothing due
 *  should look like empty calendar, not like a further category. */
export type DayTone = "full" | "partial" | "missed" | "none";

type ToneStyle = {
  /** The colour, and nothing else — the shape classes are composed around it,
   *  so the dot in a cell and the swatch in the legend cannot drift apart on
   *  colour. */
  paint: string;
  /** Drawn as an outline rather than a fill — the "still open" half of the
   *  grammar. */
  outlined?: boolean;
};

/** The paint for each tone. The fills are translucent tints rather than solid
 *  colours: the day number's own colour is the framework's (`text-fg`, or the
 *  accent on today), and a tint keeps all of them legible in both themes
 *  without this module having to restyle text it does not own.
 *
 *  `full` and `partial` carry the *same* alpha, so a part-done day is the
 *  colour a done day is and the only difference between them is that one is
 *  hollow — if hollow also meant "dimmer", the legend would be showing three
 *  claims where the grammar only has two. The outline is drawn two pixels
 *  wide instead (see `DayMark`): a hairline at the fill's alpha has too
 *  little ink to see, and weight is the one dimension left free to
 *  compensate. `missed` is the semantic danger tone, quiet on purpose — the
 *  calendar's job is to show the gap, not to scold. */
const TONE: Record<Exclude<DayTone, "none">, ToneStyle> = {
  full: { paint: "bg-accent/45" },
  partial: { paint: "border-accent/45", outlined: true },
  missed: { paint: "bg-danger/25" },
};

/**
 * Which tone a day's progress wears.
 *
 * The one judgement call is `missed` vs merely unfinished, and it belongs to
 * the caller's clock, not to the counts: an empty *today* is a day in
 * progress, an empty yesterday is a gap. So the mapping takes the day and
 * today and gives today (and every future day) the hollow "still open" mark
 * whenever anything remains — the calendar never marks a day missed while it
 * can still be mended by bedtime.
 */
export function toneFor(
  day: DayKey,
  today: DayKey,
  progress: DayProgress,
): DayTone {
  if (progress.status === "none") return "none";
  if (progress.status === "full") return "full";
  if (day >= today) return "partial";
  return progress.status === "missed" ? "missed" : "partial";
}

/** The mark itself. Non-interactive and absolutely positioned — the cell
 *  around it is the button. Inset `1` on every side so the dot's centre sits
 *  where the number's does. */
export function DayMark({ tone }: { tone: DayTone }) {
  if (tone === "none") return null;
  const style = TONE[tone];
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-1 inset-y-1 -z-10 rounded-full ${style.paint} ${
        style.outlined ? "border-2" : ""
      }`}
    />
  );
}

/** The key to the colours, built from the same table the cells read. */
export function DayLegend() {
  const t = useT();
  const tones: Exclude<DayTone, "none">[] = ["full", "partial", "missed"];
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {tones.map((tone) => {
        const style = TONE[tone];
        return (
          <li key={tone} className="flex items-center gap-1.5">
            {/* `shrink-0`: an empty span's min-content width is zero, so on a
                narrow row it would give up its swatch to the label beside
                it. */}
            <span
              className={`h-3 w-3 shrink-0 rounded-full ${
                style.outlined ? "border-2" : ""
              } ${style.paint}`}
            />
            {t(`calendar.legend.${tone}` as const)}
          </li>
        );
      })}
    </ul>
  );
}
