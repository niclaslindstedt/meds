// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The adherence arithmetic. The two rules stated at the top of `stats.ts` —
// today never counts against you, and a day with nothing due says nothing —
// are the ones every test here leans on, because they are the ones a naive
// reimplementation would get wrong first.

import { describe, expect, it } from "vitest";

import {
  adherence,
  adherenceLastDays,
  dailyShares,
  earliestStart,
  medAdherence,
  missedDoses,
  streaks,
  totalTaken,
} from "../src/app/stats.ts";
import {
  doseKey,
  emptyDoc,
  type AppData,
  type Medication,
} from "../src/app/types.ts";

function med(overrides: Partial<Medication> = {}): Medication {
  return {
    id: "m1",
    name: "Levothyroxine",
    dose: "",
    times: ["08:00"],
    startDate: "2024-03-01",
    endDate: null,
    updatedAt: "2024-03-01T08:00:00.000Z",
    ...overrides,
  };
}

/** A document where `takenDays` of the one-dose med are logged. */
function docTaken(meds: Medication[], takenDays: string[]): AppData {
  const days: AppData["days"] = {};
  for (const day of takenDays) {
    days[day] = {
      date: day,
      taken: { [doseKey("m1", "08:00")]: `${day}T08:05:00.000Z` },
      updatedAt: `${day}T08:05:00.000Z`,
    };
  }
  return {
    ...emptyDoc(),
    medications: Object.fromEntries(meds.map((m) => [m.id, m])),
    days,
  };
}

describe("earliestStart", () => {
  it("is null on an empty document and the earliest start otherwise", () => {
    expect(earliestStart(emptyDoc())).toBeNull();
    const data = docTaken(
      [med(), med({ id: "m2", startDate: "2024-02-15" })],
      [],
    );
    expect(earliestStart(data)).toBe("2024-02-15");
  });
});

describe("adherence", () => {
  it("counts taken over due across the window", () => {
    const data = docTaken([med()], ["2024-03-01", "2024-03-02"]);
    const result = adherence(data, "2024-03-01", "2024-03-04");
    expect(result).toEqual({ taken: 2, due: 4, share: 0.5 });
  });

  it("has no claim to make when nothing was due", () => {
    const data = docTaken([med()], []);
    expect(adherence(data, "2024-02-01", "2024-02-10").share).toBeNull();
  });

  it("ends the last-N-days window at yesterday, not today", () => {
    // Every day up to yesterday taken; today untouched. A window that
    // included today would read 6/7 — the rule says 3/3.
    const data = docTaken([med()], ["2024-03-10", "2024-03-11", "2024-03-12"]);
    const result = adherenceLastDays(data, "2024-03-13", 3);
    expect(result).toEqual({ taken: 3, due: 3, share: 1 });
  });
});

describe("medAdherence", () => {
  it("scores one med against only its own scheduled days", () => {
    const late = med({ id: "m2", name: "D3", startDate: "2024-03-10" });
    const data = docTaken([med(), late], ["2024-03-08", "2024-03-09"]);
    // Window: the 5 days before the 11th. m2 was only scheduled on the 10th.
    const result = medAdherence(data, late, "2024-03-11", 5);
    expect(result.due).toBe(1);
    expect(result.taken).toBe(0);
  });
});

describe("streaks", () => {
  it("counts consecutive full days back from yesterday", () => {
    const data = docTaken(
      [med({ startDate: "2024-03-01" })],
      ["2024-03-03", "2024-03-04", "2024-03-05"],
    );
    expect(streaks(data, "2024-03-06").current).toBe(3);
  });

  it("gives an unfinished today grace and a finished today credit", () => {
    const base = ["2024-03-04", "2024-03-05"];
    const unfinished = docTaken([med({ startDate: "2024-03-04" })], base);
    expect(streaks(unfinished, "2024-03-06").current).toBe(2);
    const finished = docTaken(
      [med({ startDate: "2024-03-04" })],
      [...base, "2024-03-06"],
    );
    expect(streaks(finished, "2024-03-06").current).toBe(3);
  });

  it("breaks the current streak on a missed day", () => {
    const data = docTaken(
      [med({ startDate: "2024-03-01" })],
      [
        "2024-03-02",
        // 03-03 missed
        "2024-03-04",
        "2024-03-05",
      ],
    );
    const result = streaks(data, "2024-03-06");
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it("steps over days with nothing due without counting them", () => {
    // The med starts on the 5th; the empty 1st–4th neither break nor pad.
    const data = docTaken(
      [med({ startDate: "2024-03-05" })],
      ["2024-03-05", "2024-03-06"],
    );
    expect(streaks(data, "2024-03-07").current).toBe(2);
  });

  it("is all zeroes on an empty document", () => {
    expect(streaks(emptyDoc(), "2024-03-06")).toEqual({
      current: 0,
      longest: 0,
    });
  });
});

describe("dailyShares", () => {
  it("yields one point per finished day, null where nothing was due", () => {
    const data = docTaken([med({ startDate: "2024-03-02" })], ["2024-03-02"]);
    const shares = dailyShares(data, "2024-03-04", 3);
    expect(shares).toEqual([
      { day: "2024-03-01", share: null },
      { day: "2024-03-02", share: 1 },
      { day: "2024-03-03", share: 0 },
    ]);
  });
});

describe("missedDoses", () => {
  it("lists unlogged due doses from finished days, newest first", () => {
    const data = docTaken([med({ startDate: "2024-03-01" })], ["2024-03-02"]);
    const missed = missedDoses(data, "2024-03-04", 3);
    expect(missed.map((m) => m.day)).toEqual(["2024-03-03", "2024-03-01"]);
  });

  it("never blames today", () => {
    const data = docTaken([med({ startDate: "2024-03-04" })], []);
    expect(missedDoses(data, "2024-03-04", 7)).toEqual([]);
  });
});

describe("totalTaken", () => {
  it("counts every logged tap", () => {
    const data = docTaken([med()], ["2024-03-01", "2024-03-02"]);
    expect(totalTaken(data)).toBe(2);
  });
});
