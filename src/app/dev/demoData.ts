// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The invented document behind the developer "Demo data" toggle: three
// medications and three months of history, built as a pure function of the
// day it is anchored to. Deterministic on purpose — a seeded generator, no
// `Math.random` — so a screenshot session and a test see the same document.
//
// The shape is designed to exercise every state the screens can show: mostly
// full days (the streaks and the high adherence numbers), scattered part-days
// (the hollow calendar marks and the per-med spread), one solid gap week (the
// red run every history feature exists to surface), and one med that started
// later than the others (the "nothing due before the schedule" rule).

import { addDays, type DayKey } from "@niclaslindstedt/oss-framework/calendar";

import { doseKey, type AppData, type Medication } from "../types.ts";

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
      startDate: start,
      endDate: null,
      updatedAt: `${start}T08:00:00.000Z`,
    },
    {
      id: "demo-metformin",
      name: "Metformin",
      dose: "500 mg",
      times: ["08:00", "20:00"],
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
      startDate: lateStart,
      endDate: null,
      updatedAt: `${lateStart}T08:00:00.000Z`,
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
      if (day < med.startDate) continue;
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

  return {
    version: 1,
    medications: Object.fromEntries(meds.map((m) => [m.id, m])),
    days,
  };
}
