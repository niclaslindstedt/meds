// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The demo document: one person's medicines and three months of taps, built
// as a pure function of the moment the demo opens. It is the live demo
// (`make demo`, Settings → Developer → Demo data) and what the App Store
// screenshots are taken of, so it is written to be looked at: ordinary
// medicines at ordinary doses, a record kept well but not perfectly, and
// nothing on any screen that reads as a warning.
//
// The person: in their late thirties, a blood-pressure tablet every morning,
// an allergy tablet since the autumn pollen started, the supplements a doctor
// suggested (vitamin D and omega-3 with breakfast, omega-3 again with dinner,
// B12 three days a week), magnesium at bedtime. As needed: ibuprofen, with
// the most-in-a-day they were given, reached for a few times a season — and a
// cold medicine taken at three set times for the five days a cold lasted.
//
// Every day is an offset from today, so nothing ages: whatever day the demo
// opens, yesterday is full, the week is complete, and the month has three
// small dips in it. Today is written only up to `now` — a dose whose tap time
// has passed is ticked, a later one is still open — so the Today screen is
// live at any hour of any day.
//
// Deterministic: the minute of each tap comes from a hash of its day and
// slot, never `Math.random`, so a screenshot session and the test see the
// same document for the same moment.

import {
  addDays,
  dayKeyOf,
  type DayKey,
} from "@niclaslindstedt/oss-framework/calendar";

import { activeOn, asNeededDue, weekdayOf } from "../schedule.ts";
import {
  doseKey,
  DOC_VERSION,
  type AppData,
  type DayLog,
  type Medication,
} from "../types.ts";

/** How far back the history runs, in days. */
const DAYS = 90;

/** The fixed facts of one medication, and how many days ago it was added;
 *  the builder fills in the rest. */
type MedSpec = Pick<Medication, "id" | "name" | "dose" | "times"> &
  Partial<Pick<Medication, "asNeeded" | "maxPerDay" | "weekdays">> & {
    since: number;
  };

const MEDS: MedSpec[] = [
  // The two morning tablets, taken together with the first glass of water.
  {
    id: "demo-lisinopril",
    name: "Lisinopril",
    dose: "10 mg",
    times: ["07:30"],
    since: DAYS,
  },
  // The autumn pollen: added in mid-August, so the Meds list says "Since" a
  // date inside the history and the mornings grow a dose partway through.
  {
    id: "demo-cetirizine",
    name: "Cetirizine",
    dose: "10 mg",
    times: ["07:30"],
    since: 40,
  },
  // With breakfast.
  {
    id: "demo-d3",
    name: "Vitamin D3",
    dose: "2,000 IU",
    times: ["08:00"],
    since: DAYS,
  },
  // With breakfast and again with dinner.
  {
    id: "demo-omega3",
    name: "Omega-3",
    dose: "1,000 mg",
    times: ["08:00", "19:00"],
    since: DAYS,
  },
  // Three days a week, on a weekday mask: the other four owe it nothing.
  {
    id: "demo-b12",
    name: "Vitamin B12",
    dose: "1,000 mcg",
    times: ["08:00"],
    weekdays: [1, 3, 5],
    since: 62,
  },
  {
    id: "demo-magnesium",
    name: "Magnesium glycinate",
    dose: "200 mg",
    times: ["21:30"],
    since: DAYS,
  },
  // As needed, no times: each dose is its own record, and the day's taps are
  // counted against the number its owner was given.
  {
    id: "demo-ibuprofen",
    name: "Ibuprofen",
    dose: "200 mg",
    times: [],
    asNeeded: true,
    maxPerDay: 3,
    since: DAYS,
  },
  // As needed, with times: on your days only while a course runs.
  {
    id: "demo-guaifenesin",
    name: "Guaifenesin",
    dose: "400 mg",
    times: ["08:00", "14:00", "20:00"],
    asNeeded: true,
    since: DAYS,
  },
];

/** The one cold, in days back: five days, started at lunchtime on the first
 *  — so that day owes the afternoon and evening doses and not the morning's
 *  (see `asNeededDue`). */
const COLD = { from: 20, fromTime: "12:40", to: 16 };

/** Doses that slipped, as (days back, medication, slot): one in the last
 *  fortnight — the honest data point the History screen's missed list shows
 *  — and a handful further back, always an evening one, never a whole day. */
const MISSED: [number, string, string][] = [
  [8, "demo-omega3", "19:00"],
  [19, "demo-magnesium", "21:30"],
  [26, "demo-omega3", "19:00"],
  [38, "demo-magnesium", "21:30"],
  [45, "demo-omega3", "19:00"],
  [53, "demo-omega3", "19:00"],
  [64, "demo-magnesium", "21:30"],
  [72, "demo-omega3", "19:00"],
  [83, "demo-magnesium", "21:30"],
];

/** The night away: both evening doses set aside that afternoon, so the day
 *  still reads full and the missed list never names them. */
const SET_ASIDE: [number, string, string][] = [
  [13, "demo-omega3", "19:00"],
  [13, "demo-magnesium", "21:30"],
];

/** Ibuprofen, as (days back, minute): a stiff back after a long run, a
 *  headache or two, the cold's first two days. Never today, and never more
 *  than two in a day. */
const IBUPROFEN: [number, string][] = [
  [67, "14:20"],
  [48, "16:05"],
  [48, "21:40"],
  [34, "11:15"],
  [20, "18:10"],
  [19, "13:45"],
  [6, "17:25"],
];

/** A small deterministic hash of its parts, onto [0, 1). */
function unit(...parts: (string | number)[]): number {
  let h = 2166136261;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** When a slot's doses were tapped on a day, in minutes past midnight: never
 *  on the slot itself, later at weekends, later on a Friday or Saturday
 *  evening. The tablets of one slot are tapped together, so the minute
 *  belongs to the slot, not to the medication. */
function tapMinute(back: number, day: DayKey, slot: string): number {
  const weekday = weekdayOf(day);
  const weekend = weekday === 0 || weekday === 6;
  const lateNight = weekday === 5 || weekday === 6;
  const r = unit(back, slot);
  // A tap is never on the dot: a span that crosses the slot steps past it.
  const span = (from: string, to: string) => {
    const minute = Math.round(
      minutes(from) + r * (minutes(to) - minutes(from)),
    );
    return minute === minutes(slot) ? minute + 3 : minute;
  };
  switch (slot) {
    case "07:30":
      return weekend ? span("08:12", "08:38") : span("07:22", "07:49");
    case "08:00":
      return weekend ? span("08:41", "09:08") : span("08:05", "08:33");
    case "14:00":
      return span("14:04", "14:31");
    case "19:00":
      return lateNight ? span("20:05", "20:41") : span("18:52", "19:38");
    case "20:00":
      return span("20:02", "20:39");
    case "21:30":
      return lateNight ? span("22:18", "23:04") : span("21:18", "22:09");
    default:
      return minutes(slot) + 6;
  }
}

/** A local wall-clock minute of a day, as the ISO timestamp a tap stores —
 *  local, because a tap stores `new Date().toISOString()` and the rows read
 *  it back on the device's clock. */
function at(day: DayKey, minute: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(
    y,
    m - 1,
    d,
    Math.floor(minute / 60),
    minute % 60,
  ).toISOString();
}

/** Build the demo document for the moment the demo opens: the history ends
 *  at `now`, and today holds only the taps whose minute has passed. */
export function buildDemoData(now: Date): AppData {
  const today = dayKeyOf(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();

  // Field by field in the document's own order, so the demo serializes to
  // the bytes a parsed copy of it does.
  const meds: Medication[] = MEDS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    dose: spec.dose,
    times: spec.times,
    asNeeded: spec.asNeeded ?? false,
    courses: [],
    maxPerDay: spec.maxPerDay ?? null,
    maxRun: null,
    maxRunUnit: "days",
    weekdays: spec.weekdays ?? null,
    startDate: addDays(today, -spec.since),
    endDate: null,
    // Added over breakfast on the day its schedule starts.
    updatedAt: at(addDays(today, -spec.since), 9 * 60 + 12),
  }));
  const course = meds.find((m) => m.id === "demo-guaifenesin")!;
  course.courses = [
    {
      from: addDays(today, -COLD.from),
      fromTime: COLD.fromTime,
      to: addDays(today, -COLD.to),
    },
  ];

  const tagged = (list: [number, string, string][]) =>
    new Set(list.map(([back, id, slot]) => `${back}|${doseKey(id, slot)}`));
  const missed = tagged(MISSED);
  const setAside = tagged(SET_ASIDE);
  const days: Record<DayKey, DayLog> = {};

  for (let back = DAYS; back >= 0; back--) {
    const day = addDays(today, -back);
    const taken: Record<string, string> = {};
    const skipped: Record<string, string> = {};
    let last = 0;
    // Through `activeOn` and `asNeededDue`, so the log is one the app's own
    // derivation would have asked for: no tap on a day that owed nothing.
    for (const med of meds) {
      if (!activeOn(med, day)) continue;
      const slots = med.asNeeded ? asNeededDue(med, day) : med.times;
      for (const slot of slots) {
        const key = doseKey(med.id, slot);
        const tag = `${back}|${key}`;
        const minute = tapMinute(back, day, slot);
        // Today is written up to the moment the demo opens, and no further.
        if (back === 0 && minute > nowMinute) continue;
        if (missed.has(tag)) continue;
        if (setAside.has(tag)) {
          skipped[key] = at(day, 17 * 60 + 40);
          last = Math.max(last, 17 * 60 + 40);
          continue;
        }
        taken[key] = at(day, minute);
        last = Math.max(last, minute);
      }
    }
    for (const [ago, time] of IBUPROFEN) {
      if (ago !== back) continue;
      taken[doseKey("demo-ibuprofen", time)] = at(day, minutes(time));
      last = Math.max(last, minutes(time));
    }
    if (Object.keys(taken).length + Object.keys(skipped).length === 0) continue;
    days[day] = { date: day, taken, skipped, updatedAt: at(day, last) };
  }

  return {
    version: DOC_VERSION,
    medications: Object.fromEntries(meds.map((m) => [m.id, m])),
    days,
  };
}
