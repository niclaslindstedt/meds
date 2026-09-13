// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The invented document behind the developer "Demo data" toggle: three
// medications and three months of history, built as a pure function of the
// day it is anchored to. Deterministic on purpose — a seeded generator, no
// `Math.random` — so a screenshot session and a test see the same document.
//
// The shape is designed to exercise every state the screens can show: mostly
// full days (the streaks and the high adherence numbers), scattered part-days
// (the hollow calendar marks and the per-med spread), one solid gap week (the
// red run every history feature exists to surface), one med that started
// later than the others (the "nothing due before the schedule" rule), one on
// a weekday mask (the days that owe nothing and therefore say nothing), and
// two taken when needed — a painkiller with no times at all, and a five-day
// course at three set times that only the days it was taken owe anything for
// (the "As needed" panel, and the rule in `asNeededDue`).

import { addDays, type DayKey } from "@niclaslindstedt/oss-framework/calendar";

import { activeOn } from "../schedule.ts";
import {
  doseKey,
  DOC_VERSION,
  type AppData,
  type Medication,
} from "../types.ts";

/** How much history the demo document carries. */
const DAYS = 90;

/** A tiny deterministic PRNG (mulberry32). Good enough to scatter misses;
 *  seeded so every enable of the toggle builds the same story. */
function rng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build the demo document, anchored so its history ends at `today`. */
export function buildDemoData(today: DayKey): AppData {
  const start = addDays(today, -DAYS);
  const lateStart = addDays(today, -35);

  const meds: Medication[] = [
    {
      id: "demo-levo",
      name: "Levothyroxine",
      dose: "50 µg",
      times: ["07:30"],
      asNeeded: false,
      courses: [],
      weekdays: null,
      startDate: start,
      endDate: null,
      updatedAt: `${start}T08:00:00.000Z`,
    },
    {
      id: "demo-metformin",
      name: "Metformin",
      dose: "500 mg",
      times: ["08:00", "20:00"],
      asNeeded: false,
      courses: [],
      weekdays: null,
      startDate: start,
      endDate: null,
      updatedAt: `${start}T08:00:00.000Z`,
    },
    // Started mid-history, so the calendar shows the schedule growing and the
    // stats show a med with a shorter denominator.
    {
      id: "demo-d3",
      name: "Vitamin D3",
      dose: "1000 IU",
      times: ["08:00"],
      asNeeded: false,
      courses: [],
      weekdays: null,
      startDate: lateStart,
      endDate: null,
      updatedAt: `${lateStart}T08:00:00.000Z`,
    },
    // On a weekday mask, so four days in seven the calendar has a day that
    // owes this med nothing — and the adherence figure passes over those
    // rather than counting them missed.
    {
      id: "demo-iron",
      name: "Duroferon",
      dose: "100 mg",
      times: ["12:00"],
      asNeeded: false,
      courses: [],
      weekdays: [1, 3, 5],
      startDate: start,
      endDate: null,
      updatedAt: `${start}T08:00:00.000Z`,
    },
    // Taken when needed, with no times of its own: every dose is filed under
    // the minute it was swallowed, and the ninety days nobody reached for it
    // cost the adherence figure nothing.
    {
      id: "demo-alvedon",
      name: "Alvedon",
      dose: "500 mg",
      times: [],
      asNeeded: true,
      // No times means no stretches to be on: each dose is its own record.
      courses: [],
      weekdays: null,
      startDate: start,
      endDate: null,
      updatedAt: `${start}T08:00:00.000Z`,
    },
    // Taken when needed, but at three set times for as long as it is being
    // taken at all — the course that does nothing unless it is kept up for a
    // few days running. One finished course a fortnight back, so the calendar
    // shows a short block of scored days with silence either side.
    {
      id: "demo-bisolvon",
      name: "Bisolvon",
      dose: "8 mg",
      times: ["08:00", "12:00", "18:00"],
      asNeeded: true,
      courses: [{ from: addDays(today, -16), to: addDays(today, -12) }],
      weekdays: null,
      startDate: start,
      endDate: null,
      updatedAt: `${start}T08:00:00.000Z`,
    },
  ];

  const random = rng(42);
  const days: AppData["days"] = {};

  // The gap week: a holiday five weeks back where nothing was logged at all.
  const gapStart = addDays(today, -37);
  const gapEnd = addDays(today, -31);

  for (let i = DAYS; i >= 1; i--) {
    const day = addDays(today, -i);
    if (day >= gapStart && day <= gapEnd) continue;

    const taken: Record<string, string> = {};
    for (const med of meds) {
      // Through `activeOn` rather than a start-date check of its own: the
      // demo document must be one the derivation would have produced, and a
      // tap on a day the schedule never asked about is not one. The as-needed
      // meds are not part of the daily story at all — their days are written
      // out one by one below.
      if (med.asNeeded) continue;
      if (!activeOn(med, day)) continue;
      for (const time of med.times) {
        // The evening dose is the one that slips — which is true to life and
        // gives the per-med list something to say.
        const missChance = time >= "18:00" ? 0.14 : 0.04;
        if (random() < missChance) continue;
        taken[doseKey(med.id, time)] = `${day}T${time}:00.000Z`;
      }
    }
    if (Object.keys(taken).length > 0) {
      days[day] = { date: day, taken, updatedAt: `${day}T21:00:00.000Z` };
    }
  }

  // Today arrives part-done: the morning handful ticked, the evening dose
  // still open — the state the Today screen is designed around.
  const todayTaken: Record<string, string> = {};
  for (const med of meds) {
    if (med.asNeeded) continue;
    if (!activeOn(med, today)) continue;
    for (const time of med.times) {
      if (time < "12:00") {
        todayTaken[doseKey(med.id, time)] = `${today}T${time}:00.000Z`;
      }
    }
  }
  days[today] = {
    date: today,
    taken: todayTaken,
    updatedAt: `${today}T08:05:00.000Z`,
  };

  /** File one as-needed dose into a day, leaving whatever is already there. */
  const log = (day: DayKey, medId: string, time: string) => {
    const existing = days[day];
    const taken = { ...(existing?.taken ?? {}) };
    taken[doseKey(medId, time)] = `${day}T${time}:00.000Z`;
    days[day] = {
      date: day,
      taken,
      updatedAt: existing?.updatedAt ?? `${day}T21:00:00.000Z`,
    };
  };

  // The painkiller: a handful of scattered days over three months, at the
  // odd minutes a painkiller actually gets taken at, and one today so the
  // "As needed" panel opens with something already under it. Fixed offsets
  // rather than the PRNG — the story is "rarely, and never on a schedule",
  // and a generator would only make it less legible.
  for (const [back, time] of [
    [55, "14:12"],
    [41, "21:40"],
    [22, "09:05"],
    [22, "15:35"],
    [8, "23:10"],
    [3, "11:27"],
    [0, "10:12"],
  ] as const) {
    log(addDays(today, -back), "demo-alvedon", time);
  }

  // The course itself is the `courses` entry on the medication above; these
  // are the taps against it. Five days running, kept almost perfectly — one
  // evening dropped on the fourth, so the missed list has a row that is not a
  // whole day gone. Which is what an as-needed schedule looks like when it is
  // kept: a short block of days the calendar scores, surrounded by days that
  // owe nothing at all.
  for (const back of [16, 15, 14, 12]) {
    for (const time of ["08:00", "12:00", "18:00"]) {
      log(addDays(today, -back), "demo-bisolvon", time);
    }
  }
  for (const time of ["08:00", "12:00"]) {
    log(addDays(today, -13), "demo-bisolvon", time);
  }

  return {
    version: DOC_VERSION,
    medications: Object.fromEntries(meds.map((m) => [m.id, m])),
    days,
  };
}
