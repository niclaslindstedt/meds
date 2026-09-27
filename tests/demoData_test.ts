// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The demo document. It is the live demo and what the store screenshots are
// taken of, so the test pins what those frames stand on: a valid document
// (through the same pipeline real bytes go through), deterministic for a
// moment, never a tap after the moment it opens — and, for every day of a
// year as "now", the calm, well-kept record each screen is staged on. Every
// figure is read through the app's own derivation, never restated.

import { describe, expect, it } from "vitest";

import { addDays, dayKeyOf } from "@niclaslindstedt/oss-framework/calendar";

import { buildDemoData } from "../src/app/dev/demoData.ts";
import { normalizeDoc, serializeDoc } from "../src/app/migrations.ts";
import {
  asNeededOn,
  dayProgress,
  dueDoses,
  weekdayOf,
} from "../src/app/schedule.ts";
import {
  adherenceLastDays,
  earliestStart,
  missedDoses,
  streaks,
} from "../src/app/stats.ts";

/** The status bar's moment: 9:41 on a Saturday (the screenshots' clock). */
const NOW = new Date(2026, 8, 26, 9, 41);
const TODAY = dayKeyOf(NOW);

describe("buildDemoData", () => {
  const data = buildDemoData(NOW);

  it("is deterministic for a moment", () => {
    expect(serializeDoc(buildDemoData(new Date(NOW)))).toBe(serializeDoc(data));
  });

  it("survives the real parse pipeline unchanged", () => {
    expect(serializeDoc(normalizeDoc(JSON.parse(serializeDoc(data))))).toBe(
      serializeDoc(data),
    );
  });

  it("never logs a tap after the moment the demo opens", () => {
    for (const log of Object.values(data.days)) {
      for (const stamp of [
        ...Object.values(log.taken),
        ...Object.values(log.skipped),
      ]) {
        expect(new Date(stamp).getTime()).toBeLessThanOrEqual(NOW.getTime());
      }
    }
  });

  it("stores taps as local wall-clock minutes, never on the slot itself", () => {
    // The morning tablets on the frame's Saturday: after the lie-in.
    const morning = new Date(data.days[TODAY]!.taken["demo-lisinopril@07:30"]!);
    expect(morning.getHours()).toBe(8);
    for (const log of Object.values(data.days)) {
      for (const [key, stamp] of Object.entries(log.taken)) {
        const slot = key.split("@")[1]!;
        const d = new Date(stamp);
        const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        if (!key.startsWith("demo-ibuprofen@")) expect(hhmm).not.toBe(slot);
      }
    }
  });

  it("carries six scheduled medications and two taken as needed", () => {
    const meds = Object.values(data.medications);
    expect(meds.filter((m) => !m.asNeeded)).toHaveLength(6);
    expect(meds.every((m) => m.endDate === null)).toBe(true);
    expect(meds.filter((m) => m.weekdays !== null)).toHaveLength(1);
    const asNeeded = meds.filter((m) => m.asNeeded);
    expect(asNeeded.map((m) => m.times.length).sort()).toEqual([0, 3]);
    // Every medication's history is inside the document: nothing is due on
    // a day before the log begins.
    expect(earliestStart(data)).toBe(addDays(TODAY, -90));
  });

  it("stages today at 9:41: the morning ticked, the evening open", () => {
    const doses = dueDoses(data, TODAY);
    for (const dose of doses) {
      expect(dose.takenAt !== null).toBe(dose.time < "12:00");
    }
    // Saturday: no B12, so six doses and four of them taken.
    expect(dayProgress(data, TODAY)).toEqual({
      due: 6,
      taken: 4,
      status: "partial",
    });
  });

  it("stages the as-needed sheet: ibuprofen at none of its three today", () => {
    const ibuprofen = asNeededOn(data, TODAY).find(
      (e) => e.med.id === "demo-ibuprofen",
    )!;
    expect(ibuprofen.allowance).toEqual({ max: 3, taken: 0, left: 3 });
    // And the cold medicine is not running, so it offers "Start taking it".
    const course = asNeededOn(data, TODAY).find(
      (e) => e.med.id === "demo-guaifenesin",
    )!;
    expect(course.course).toBeNull();
  });

  it("runs the cold as five scored days that start at lunchtime", () => {
    const owed = (back: number) =>
      dueDoses(data, addDays(TODAY, -back))
        .filter((d) => d.med.id === "demo-guaifenesin")
        .map((d) => d.time);
    expect(owed(21)).toEqual([]);
    expect(owed(20)).toEqual(["14:00", "20:00"]);
    for (let back = 19; back >= 16; back--) {
      expect(owed(back)).toEqual(["08:00", "14:00", "20:00"]);
    }
    expect(owed(15)).toEqual([]);
  });

  it("sets the night away aside: the day reads full, and no miss is named", () => {
    const away = addDays(TODAY, -13);
    expect(Object.keys(data.days[away]!.skipped)).toHaveLength(2);
    expect(dayProgress(data, away).status).toBe("full");
  });

  it("logs the B12 only on its own weekdays", () => {
    for (const log of Object.values(data.days)) {
      if (log.taken["demo-b12@08:00"] === undefined) continue;
      expect([1, 3, 5]).toContain(weekdayOf(log.date));
    }
  });

  it("holds every frame's premise for every day of a year", () => {
    for (let i = 0; i < 366; i++) {
      const now = new Date(2026, 0, 1 + i, 9, 41);
      const today = dayKeyOf(now);
      const doc = buildDemoData(now);

      // Today: live, the morning ticked, the evening still open.
      const progress = dayProgress(doc, today);
      expect(progress.status).toBe("partial");
      expect(progress.taken).toBeGreaterThanOrEqual(4);

      // The calendar: yesterday full, and no day of the history red.
      expect(dayProgress(doc, addDays(today, -1)).status).toBe("full");
      for (let back = 1; back <= 90; back++) {
        expect(dayProgress(doc, addDays(today, -back)).status).not.toBe(
          "missed",
        );
      }

      // History: a clean week, a strong month, a streak, one honest miss.
      expect(adherenceLastDays(doc, today, 7).share).toBe(1);
      expect(adherenceLastDays(doc, today, 30).share!).toBeGreaterThanOrEqual(
        0.95,
      );
      expect(streaks(doc, today).current).toBe(7);
      const missed = missedDoses(doc, today, 14);
      expect(missed).toHaveLength(1);
      expect(missed[0]!.dose.med.id).toBe("demo-omega3");

      // The as-needed sheet: nothing logged today, so its first tap is 1 of 3.
      const ibuprofen = asNeededOn(doc, today).find(
        (e) => e.med.id === "demo-ibuprofen",
      )!;
      expect(ibuprofen.allowance!.taken).toBe(0);
    }
  });
});
