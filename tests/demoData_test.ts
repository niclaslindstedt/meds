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
import { dayProgress, dueDoses, weekdayOf } from "../src/app/schedule.ts";
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

  it("carries four current medications, one late-starting and one masked", () => {
    const meds = Object.values(data.medications);
    expect(meds).toHaveLength(4);
    expect(meds.every((m) => m.endDate === null)).toBe(true);
    const starts = new Set(meds.map((m) => m.startDate));
    expect(starts.size).toBe(2);
    expect(meds.filter((m) => m.weekdays !== null)).toHaveLength(1);
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
