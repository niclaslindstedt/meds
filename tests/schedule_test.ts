// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The schedule derivation: which doses a day owes, in what order, and how far
// through them a log is. These are the claims every screen repeats, so they
// are pinned here once — in particular the two boundary rules (a day before
// a med started owes nothing; a day after it stopped owes nothing), which are
// what keep old days from turning red when the schedule changes.

import { describe, expect, it } from "vitest";

import {
  activeOn,
  dayProgress,
  dosesByTime,
  dueDoses,
  isValidTime,
  normalizeTimes,
} from "../src/app/schedule.ts";
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
    dose: "50 µg",
    times: ["08:00"],
    startDate: "2024-03-01",
    endDate: null,
    updatedAt: "2024-03-01T08:00:00.000Z",
    ...overrides,
  };
}

function doc(meds: Medication[], days: AppData["days"] = {}): AppData {
  return {
    ...emptyDoc(),
    medications: Object.fromEntries(meds.map((m) => [m.id, m])),
    days,
  };
}

describe("activeOn", () => {
  const m = med({ startDate: "2024-03-10", endDate: "2024-03-20" });

  it("covers the start and end days inclusively", () => {
    expect(activeOn(m, "2024-03-10")).toBe(true);
    expect(activeOn(m, "2024-03-20")).toBe(true);
  });

  it("owes nothing before the start or after the stop", () => {
    expect(activeOn(m, "2024-03-09")).toBe(false);
    expect(activeOn(m, "2024-03-21")).toBe(false);
  });

  it("runs open-ended while the med is current", () => {
    expect(activeOn(med(), "2099-01-01")).toBe(true);
  });
});

describe("dueDoses", () => {
  it("lists one dose per slot per active med, sorted by time then name", () => {
    const data = doc([
      med({ id: "b", name: "Metformin", times: ["08:00", "20:00"] }),
      med({ id: "a", name: "Aspirin", times: ["08:00"] }),
    ]);
    const doses = dueDoses(data, "2024-03-15");
    expect(doses.map((d) => [d.med.name, d.time])).toEqual([
      ["Aspirin", "08:00"],
      ["Metformin", "08:00"],
      ["Metformin", "20:00"],
    ]);
  });

  it("reads the day's log into each dose", () => {
    const key = doseKey("m1", "08:00");
    const data = doc([med()], {
      "2024-03-15": {
        date: "2024-03-15",
        taken: { [key]: "2024-03-15T08:05:00.000Z" },
        updatedAt: "2024-03-15T08:05:00.000Z",
      },
    });
    const [dose] = dueDoses(data, "2024-03-15");
    expect(dose?.takenAt).toBe("2024-03-15T08:05:00.000Z");
    expect(dueDoses(data, "2024-03-16")[0]?.takenAt).toBeNull();
  });

  it("groups by slot in slot order", () => {
    const data = doc([med({ times: ["08:00", "20:00"] })]);
    const groups = dosesByTime(dueDoses(data, "2024-03-15"));
    expect(groups.map((g) => g.time)).toEqual(["08:00", "20:00"]);
    expect(groups[0]?.doses).toHaveLength(1);
  });
});

describe("dayProgress", () => {
  const key = doseKey("m1", "08:00");

  it("says none when nothing was due", () => {
    expect(dayProgress(doc([med()]), "2024-02-01").status).toBe("none");
  });

  it("says full when everything due was taken", () => {
    const data = doc([med()], {
      "2024-03-15": {
        date: "2024-03-15",
        taken: { [key]: "2024-03-15T08:05:00.000Z" },
        updatedAt: "2024-03-15T08:05:00.000Z",
      },
    });
    expect(dayProgress(data, "2024-03-15")).toEqual({
      due: 1,
      taken: 1,
      status: "full",
    });
  });

  it("splits partial from missed on whether anything was taken", () => {
    const two = med({ times: ["08:00", "20:00"] });
    const data = doc([two], {
      "2024-03-15": {
        date: "2024-03-15",
        taken: { [doseKey("m1", "08:00")]: "2024-03-15T08:05:00.000Z" },
        updatedAt: "2024-03-15T08:05:00.000Z",
      },
    });
    expect(dayProgress(data, "2024-03-15").status).toBe("partial");
    expect(dayProgress(data, "2024-03-16").status).toBe("missed");
  });

  it("ignores taps that no longer match a due dose", () => {
    // A slot edited from 08:00 to 09:00 leaves the old tap in the log; the
    // day then owes the new slot and the stale tap counts for nothing.
    const data = doc([med({ times: ["09:00"] })], {
      "2024-03-15": {
        date: "2024-03-15",
        taken: { [doseKey("m1", "08:00")]: "2024-03-15T08:05:00.000Z" },
        updatedAt: "2024-03-15T08:05:00.000Z",
      },
    });
    expect(dayProgress(data, "2024-03-15")).toEqual({
      due: 1,
      taken: 0,
      status: "missed",
    });
  });
});

describe("time validation", () => {
  it("accepts only zero-padded 24-hour times", () => {
    expect(isValidTime("08:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("8:00")).toBe(false);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("08:60")).toBe(false);
    expect(isValidTime("")).toBe(false);
  });

  it("normalises a slot list to valid, unique, sorted times", () => {
    expect(normalizeTimes(["20:00", "08:00", "20:00", "nope", ""])).toEqual([
      "08:00",
      "20:00",
    ]);
  });
});
