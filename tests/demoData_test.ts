// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The demo document. It exists to demonstrate every state the screens can
// show, so the test pins exactly that: the states are all present, the
// document is valid by the same pipeline real bytes go through, and the
// build is deterministic — a screenshot session and this suite must see the
// same story.

import { describe, expect, it } from "vitest";

import { addDays } from "@niclaslindstedt/oss-framework/calendar";

import { buildDemoData } from "../src/app/dev/demoData.ts";
import { normalizeDoc, serializeDoc } from "../src/app/migrations.ts";
import {
  asNeededOn,
  dayProgress,
  dueDoses,
  weekdayOf,
} from "../src/app/schedule.ts";
import { adherenceLastDays, missedDoses, streaks } from "../src/app/stats.ts";

const TODAY = "2024-06-15";

describe("buildDemoData", () => {
  const data = buildDemoData(TODAY);

  it("is deterministic", () => {
    expect(serializeDoc(buildDemoData(TODAY))).toBe(serializeDoc(data));
  });

  it("survives the real parse pipeline unchanged", () => {
    expect(serializeDoc(normalizeDoc(JSON.parse(serializeDoc(data))))).toBe(
      serializeDoc(data),
    );
  });

  it("carries six current medications, one late-starting, one masked and two as needed", () => {
    const meds = Object.values(data.medications);
    expect(meds).toHaveLength(6);
    expect(meds.every((m) => m.endDate === null)).toBe(true);
    const starts = new Set(meds.map((m) => m.startDate));
    expect(starts.size).toBe(2);
    expect(meds.filter((m) => m.weekdays !== null)).toHaveLength(1);
    // One with no times of its own and one with three — the two shapes the
    // "As needed" panel has to render.
    const asNeeded = meds.filter((m) => m.asNeeded);
    expect(asNeeded).toHaveLength(2);
    expect(asNeeded.filter((m) => m.times.length === 0)).toHaveLength(1);
  });

  it("costs the numbers nothing on the days nobody needed the as-needed meds", () => {
    // Three months of history, and the painkiller is logged on a handful of
    // days — but it is never *due*, so no day owes it and no day is scored
    // against it.
    const painkiller = Object.values(data.medications).find(
      (m) => m.asNeeded && m.times.length === 0,
    )!;
    for (let i = 0; i <= 90; i++) {
      const day = addDays(TODAY, -i);
      expect(dueDoses(data, day).some((d) => d.med.id === painkiller.id)).toBe(
        false,
      );
    }
    // And it is always on offer, which is how a dose of it gets logged.
    expect(
      asNeededOn(data, TODAY).some((e) => e.med.id === painkiller.id),
    ).toBe(true);
  });

  it("spends a daily maximum exactly on one day, and leaves today inside it", () => {
    const painkiller = Object.values(data.medications).find(
      (m) => m.asNeeded && m.times.length === 0,
    )!;
    expect(painkiller.maxPerDay).toBe(4);
    const allowanceOn = (day: string) =>
      asNeededOn(data, day).find((e) => e.med.id === painkiller.id)!.allowance;
    // The bad afternoon: four doses, the whole number spent — the state the
    // "As needed" panel changes shape for.
    expect(allowanceOn(addDays(TODAY, -22))).toEqual({
      max: 4,
      taken: 4,
      left: 0,
    });
    // And today, one in and three to go, which is the ordinary reading.
    expect(allowanceOn(TODAY)).toEqual({ max: 4, taken: 1, left: 3 });
  });

  it("spends the longest stretch on that same day", () => {
    const runOn = (day: string) =>
      asNeededOn(data, day).find(
        (e) => e.med.times.length === 0 && e.med.asNeeded,
      )!.run;
    // Three days running, which is the whole stretch noted for it — so one
    // day of the demo shows both ceilings spent at once.
    expect(runOn(addDays(TODAY, -22))).toEqual({
      maxDays: 3,
      days: 3,
      left: 0,
    });
    // Today is the first day of its own stretch: the day before it is empty.
    expect(runOn(TODAY)).toEqual({ maxDays: 3, days: 1, left: 2 });
  });

  it("runs the course as a block of scored days surrounded by silent ones", () => {
    const course = Object.values(data.medications).find(
      (m) => m.asNeeded && m.times.length > 0,
    )!;
    const scored = (day: string) =>
      dueDoses(data, day).filter((d) => d.med.id === course.id).length;
    // Five days running owe it something...
    for (let back = 16; back >= 12; back--) {
      expect(scored(addDays(TODAY, -back))).toBeGreaterThan(0);
    }
    // ...and the days either side of the course owe it nothing at all.
    expect(scored(addDays(TODAY, -17))).toBe(0);
    expect(scored(addDays(TODAY, -11))).toBe(0);
    // One evening dropped in the middle of it, and nothing else.
    const missed = missedDoses(data, TODAY, 20).filter(
      (m) => m.dose.med.id === course.id,
    );
    expect(missed.map((m) => m.dose.time)).toEqual(["18:00"]);
  });

  it("logs nothing for the masked med on the days it is not due", () => {
    const masked = Object.values(data.medications).find(
      (m) => m.weekdays !== null,
    )!;
    // 2024-06-15 is a Saturday, so the seven days back from it cover the
    // whole week — Sunday, Tuesday, Thursday and Saturday owe this med
    // nothing, and no tap of it may exist on those days either.
    for (let i = 0; i < 7; i++) {
      const day = addDays(TODAY, -i);
      const due = dueDoses(data, day).filter((d) => d.med.id === masked.id);
      expect(due.length > 0).toBe(masked.weekdays!.includes(weekdayOf(day)));
      const logged = Object.keys(data.days[day]?.taken ?? {}).filter((key) =>
        key.startsWith(`${masked.id}@`),
      );
      if (due.length === 0) expect(logged).toEqual([]);
    }
  });

  it("leaves today part-done, the state the Today screen is built for", () => {
    expect(dayProgress(data, TODAY).status).toBe("partial");
  });

  it("shows a dose set aside, and a day set aside whole", () => {
    // Nine days back: one evening dose declined. The day still reads full —
    // it owed everything else and got it — and the missed list never names
    // the dose.
    const evening = addDays(TODAY, -9);
    expect(data.days[evening]?.skipped["demo-metformin@20:00"]).toBeDefined();
    expect(data.days[evening]?.taken["demo-metformin@20:00"]).toBeUndefined();
    expect(dayProgress(data, evening).status).toBe("full");
    expect(missedDoses(data, TODAY, 14).some((m) => m.day === evening)).toBe(
      false,
    );

    // Five days back: the whole checklist declined. The day owes nothing, so
    // it is silent — blank on the calendar rather than red — and it is still
    // a day the document carries.
    const whole = addDays(TODAY, -5);
    expect(dueDoses(data, whole).length).toBeGreaterThan(0);
    expect(dayProgress(data, whole)).toEqual({
      due: 0,
      taken: 0,
      status: "none",
    });
  });

  it("contains the gap week and scattered misses", () => {
    // The gap week plus the scattered misses give the History screen real
    // gaps to show...
    expect(missedDoses(data, TODAY, 60).length).toBeGreaterThan(5);
    // ...while overall adherence stays the mostly-good story the tiles tell.
    const month = adherenceLastDays(data, TODAY, 30);
    expect(month.share).not.toBeNull();
    expect(month.share!).toBeGreaterThan(0.5);
    // The gap week caps how long any streak can be.
    expect(streaks(data, TODAY).longest).toBeGreaterThan(0);
  });
});
