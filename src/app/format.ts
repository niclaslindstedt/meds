// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// Presentation. The domain speaks `DayKey` (`YYYY-MM-DD`) and `HH:MM`
// everywhere — sortable, timezone-free, and what the framework's calendar
// helpers take — so this module is the single place either turns into
// something readable. The same goes for the one number with a presentation
// rule of its own: an adherence share quoted back as a percentage.
//
// `Intl` formatters are memoised per format: constructing one is the
// expensive part, and these run once per rendered calendar cell.
//
// One piece of ambient state lives here, for the same reason the locale does:
// which clock times are written on. It is a *presentation* choice, so it has
// no business on the document or in the derivation, and threading it through
// every dose row and slot heading would be a prop on half the component tree
// to say one word. `App.tsx` projects the setting onto this module on each
// render — before any screen renders, so a change to it lands in the same
// paint the setting does.

import {
  dayKeyToDate,
  formatDayKey,
  formatMonthLabel,
  type DayKey,
  type WeekStart,
} from "@niclaslindstedt/oss-framework/calendar";
import {
  formatDate,
  weekdayNames,
  weekdayOrder as frameworkWeekdayOrder,
} from "@niclaslindstedt/oss-framework/format";

// The framework owns the `Intl` formatter cache and the `DayKey` → local-date
// conversion (`dayKeyToDate`, `formatDayKey`, `formatMonthLabel`); what stays
// here is which *shapes* this app names a date in, and the one number with a
// presentation rule of its own.

/** A `DayKey` as a local `Date` at midnight, or null when it isn't a real
 *  day. Calendar days are timezone-free, so the components are read back as
 *  *local* — the same day the user tapped, whatever their offset. */
export const toDate = dayKeyToDate;

/** "5 Jul" — how this app names a date, and the only way it names one. One
 *  form rather than a long/short pair with a rule about which to reach for:
 *  the abbreviation is the one a chart tick and a list row can carry, and a
 *  headline survives it fine. */
export function formatDay(day: DayKey): string {
  return formatDayKey(day, { day: "numeric", month: "short" });
}

/** "Sun, 5 Jul 2026" — the same date with the weekday and the year, for the
 *  one place a day's own heading has to be unambiguous. */
export function formatFullDay(day: DayKey): string {
  return formatDayKey(day, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** The short weekday for a day strip ("Mon"). */
export function formatWeekday(day: DayKey): string {
  return formatDayKey(day, { weekday: "short" });
}

/** A weekday's own name ("Mon", or "Monday" in `long`), in `Date.getDay()`
 *  numbering — the numbering the medication weekday mask and the week-start
 *  setting both speak. The framework's `weekdayNames` returns the seven
 *  rotated to a given start, so asking it for a Sunday-start week gives an
 *  array indexed by exactly that numbering. */
export function formatWeekdayName(
  weekday: number,
  style: "short" | "long" = "short",
): string {
  return weekdayNames(undefined, style, 0)[weekday] ?? "";
}

/** The seven weekdays in the order a week that starts on `weekStartsOn` runs
 *  — the order the day pills are laid out in, so the row of pills and the
 *  calendar grid above it read left to right the same way. */
export function weekdayOrder(weekStartsOn: WeekStart): number[] {
  return frameworkWeekdayOrder(weekStartsOn);
}

/** A medication's weekday mask, spelled out ("Mon, Wed, Fri") in the week's
 *  own order. Empty string for a null mask: "every day" is the absence of a
 *  qualifier, and a row that says so on every medication says nothing. */
export function formatWeekdays(
  weekdays: number[] | null,
  weekStartsOn: WeekStart,
): string {
  if (weekdays === null) return "";
  return weekdayOrder(weekStartsOn)
    .filter((day) => weekdays.includes(day))
    .map((day) => formatWeekdayName(day))
    .join(", ");
}

/** "July 2026" — a month grid's heading. The long month name survives here
 *  and only here: it is the grid's title, and "Jul 2026" over a calendar
 *  page reads as an abbreviation of nothing. */
export function formatMonth(year: number, month: number): string {
  return formatMonthLabel(year, month);
}

/** Which clock this app writes times on — "system" defers to the locale, the
 *  other two override it. Module state rather than a parameter: see the note
 *  at the top of this file. */
let clock: "system" | "24" | "12" = "system";

/** Set by `App.tsx` from the user's setting. */
export function setClock(choice: "system" | "24" | "12"): void {
  clock = choice;
}

/** The `Intl` options every wall-clock time in this app is formatted with. */
function clockOptions(): Intl.DateTimeFormatOptions {
  return {
    hour: clock === "24" ? "2-digit" : "numeric",
    minute: "2-digit",
    ...(clock === "system" ? {} : { hour12: clock === "12" }),
  };
}

/** A dose slot ("08:00"), on the reader's clock — "8:00 AM" or "08:00",
 *  depending on the setting and, failing that, the locale. The stored form
 *  stays zero-padded 24-hour regardless (see `schedule.ts`); this is display
 *  only. */
export function formatTime(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return time;
  return formatDate(
    new Date(2000, 0, 1, Number(match[1]), Number(match[2])),
    undefined,
    clockOptions(),
  );
}

/** An ISO timestamp as a wall-clock time — the "taken at" note on a ticked
 *  row. Local, because that is when the tap happened for the person who
 *  tapped, and on the same clock as every slot beside it. */
export function formatMoment(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatDate(date, undefined, clockOptions());
}

/**
 * An adherence share quoted back, as a percentage.
 *
 * **A whole percent, floored, and never rounded up to 100%.**
 *
 * Whole, because a decimal claims a resolution a few weeks of taps cannot
 * back. Floored, because a quoted figure should be one the arithmetic
 * supports: "96%" says at least 96, never "96, give or take the half point I
 * rounded away" — and flooring can only understate, which is the safe
 * direction for a number someone reads as a grade.
 *
 * The two ends get the exactness they deserve. A genuine 100% — every due
 * dose taken — prints as "100%", because the arithmetic backs it and it is
 * the number the streak was earned for. But 99.4% must not: only a perfect
 * share may print as perfect. At the other end a small-but-real share prints
 * as "<1%" rather than "0%", which is reserved for a share that genuinely is
 * zero (and for the nonsense values a formatter still has to survive).
 */
export function adherencePercent(share: number): string {
  if (!(share > 0)) return "0%";
  if (share >= 1) return "100%";
  const whole = Math.floor(share * 100);
  return whole < 1 ? "<1%" : `${Math.min(99, whole)}%`;
}
