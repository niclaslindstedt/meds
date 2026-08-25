// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The schedule derivation: which doses a day owes, in what order, and how far
// through them a log is. These are the claims every screen repeats, so they
// are pinned here once — in particular the two boundary rules (a day before
// a med started owes nothing; a day after it stopped owes nothing; a day off
// the weekday mask owes nothing), which are what keep old days from turning
// red when the schedule changes.

import { describe, expect, it } from "vitest";

import {
  activeOn,
  dayProgress,
  dosesByTime,
  dueDoses,
  isValidTime,
  minutesOfDay,
  normalizeTimes,
  normalizeWeekdays,
  quickLogDistance,
  quickLogOrder,
  weekdayOf,
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
    weekdays: null,
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

// March 2024 for reference, so the weekday cases below read as dates rather
// than as numbers: the 11th is a Monday, so the 12th is a Tuesday, the 14th a
// Thursday, the 16th a Saturday and the 17th a Sunday.
describe("weekdayOf", () => {
  it("reads a day key's weekday in getDay() numbering", () => {
    expect(weekdayOf("2024-03-17")).toBe(0); // Sunday
    expect(weekdayOf("2024-03-11")).toBe(1); // Monday
    expect(weekdayOf("2024-03-16")).toBe(6); // Saturday
  });

  it("is the same answer either side of a DST change", () => {
    // The EU moved its clocks on 31 March 2024; the day before and the day
    // after are still a Saturday and a Monday wherever this runs.
    expect(weekdayOf("2024-03-30")).toBe(6);
    expect(weekdayOf("2024-04-01")).toBe(1);
  });

  it("matches no mask for a string that is not a day", () => {
    expect(weekdayOf("not-a-day")).toBe(-1);
  });
});

describe("normalizeWeekdays", () => {
  it("sorts and deduplicates", () => {
    expect(normalizeWeekdays([5, 1, 5, 3])).toEqual([1, 3, 5]);
  });

  it("drops values that are not weekdays", () => {
    expect(normalizeWeekdays([1, 7, -1, 2.5, Number.NaN, 3])).toEqual([1, 3]);
  });

  it("reads every day, all seven days and nothing at all as no mask", () => {
    expect(normalizeWeekdays(null)).toBeNull();
    expect(normalizeWeekdays(undefined)).toBeNull();
    expect(normalizeWeekdays([])).toBeNull();
    expect(normalizeWeekdays([0, 1, 2, 3, 4, 5, 6])).toBeNull();
    // ...even spelled the long way round.
    expect(normalizeWeekdays([6, 5, 4, 3, 2, 1, 0, 0])).toBeNull();
  });
});

describe("the weekday mask", () => {
  // "100 mg every day except Tuesday and Thursday" — the schedule the mask
  // exists for.
  const weekdays = [0, 1, 3, 5, 6];

  it("covers only the days it names", () => {
    const m = med({ weekdays });
    expect(activeOn(m, "2024-03-11")).toBe(true); // Monday
    expect(activeOn(m, "2024-03-12")).toBe(false); // Tuesday
    expect(activeOn(m, "2024-03-13")).toBe(true); // Wednesday
    expect(activeOn(m, "2024-03-14")).toBe(false); // Thursday
  });

  it("still obeys the start and end dates", () => {
    const m = med({ weekdays, startDate: "2024-03-13", endDate: "2024-03-15" });
    expect(activeOn(m, "2024-03-11")).toBe(false); // Monday, before it started
    expect(activeOn(m, "2024-03-13")).toBe(true);
    expect(activeOn(m, "2024-03-16")).toBe(false); // Saturday, after it stopped
  });

  it("leaves a masked-off day owing nothing rather than missing everything", () => {
    const data = doc([med({ weekdays })]);
    expect(dueDoses(data, "2024-03-12")).toEqual([]);
    // Which is the whole point: "nothing due" is silence, not a miss (see
    // `stats.ts`), so a Tuesday off never scores against the log.
    expect(dayProgress(data, "2024-03-12").status).toBe("none");
    expect(dayProgress(data, "2024-03-13").status).toBe("missed");
  });

  it("leaves an unmasked medication due every day", () => {
    const data = doc([med()]);
    expect(dueDoses(data, "2024-03-12")).toHaveLength(1);
  });

  it("masks one medication without touching another", () => {
    const data = doc([
      med({ id: "a", name: "Aspirin" }),
      med({ id: "b", name: "Duroferon", weekdays: [1, 3, 5] }),
    ]);
    expect(dueDoses(data, "2024-03-11").map((d) => d.med.id)).toEqual([
      "a",
      "b",
    ]);
    expect(dueDoses(data, "2024-03-12").map((d) => d.med.id)).toEqual(["a"]);
  });
});

describe("minutesOfDay", () => {
  it("is minutes past midnight", () => {
    expect(minutesOfDay("00:00")).toBe(0);
    expect(minutesOfDay("08:30")).toBe(510);
    expect(minutesOfDay("23:59")).toBe(1439);
  });

  it("is -1 for anything that is not a slot", () => {
    expect(minutesOfDay("8:00")).toBe(-1);
    expect(minutesOfDay("")).toBe(-1);
  });
});

describe("quickLogDistance", () => {
  const noon = 12 * 60;

  it("ranks the slot you just passed as the nearest", () => {
    expect(quickLogDistance("11:55", noon)).toBe(5);
  });

  it("counts a slot inside the grace window as imminent", () => {
    // Twenty to nine in the evening, reaching for the 21:00 dose.
    expect(quickLogDistance("21:00", 20 * 60 + 40)).toBe(20);
  });

  it("ranks a slot further ahead as the one from yesterday", () => {
    // At noon, this evening's 20:00 has not come round yet — it sorts as the
    // slot sixteen hours behind, not the one eight hours ahead.
    expect(quickLogDistance("20:00", noon)).toBe(16 * 60);
    expect(quickLogDistance("08:00", noon)).toBe(4 * 60);
    expect(quickLogDistance("08:00", noon)).toBeLessThan(
      quickLogDistance("20:00", noon),
    );
  });

  it("wraps around midnight", () => {
    // Half past midnight: the 23:00 dose was ninety minutes ago.
    expect(quickLogDistance("23:00", 30)).toBe(90);
  });

  it("sorts an unreadable slot last", () => {
    expect(quickLogDistance("nope", noon)).toBeGreaterThan(1440);
  });
});

describe("quickLogOrder", () => {
  const data = doc([
    med({ id: "a", name: "Aspirin", times: ["08:00", "20:00"] }),
    med({ id: "b", name: "Metformin", times: ["08:00"] }),
  ]);

  it("puts the likeliest dose first", () => {
    // Four in the afternoon: the morning doses are overdue, the evening one
    // has not come round.
    const order = quickLogOrder(dueDoses(data, "2024-03-15"), 16 * 60);
    expect(order.map((d) => d.key)).toEqual(["a@08:00", "b@08:00", "a@20:00"]);
  });

  it("follows the clock round the day", () => {
    const order = quickLogOrder(dueDoses(data, "2024-03-15"), 19 * 60 + 30);
    expect(order[0]?.key).toBe("a@20:00");
  });

  it("sends what is already logged to the bottom", () => {
    const logged = doc(
      [
        med({ id: "a", name: "Aspirin", times: ["08:00", "20:00"] }),
        med({ id: "b", name: "Metformin", times: ["08:00"] }),
      ],
      {
        "2024-03-15": {
          date: "2024-03-15",
          taken: { "a@08:00": "2024-03-15T08:02:00.000Z" },
          updatedAt: "2024-03-15T08:02:00.000Z",
        },
      },
    );
    const order = quickLogOrder(dueDoses(logged, "2024-03-15"), 16 * 60);
    expect(order.map((d) => d.key)).toEqual(["b@08:00", "a@20:00", "a@08:00"]);
  });

  it("keeps every dose and leaves the input alone", () => {
    const doses = dueDoses(data, "2024-03-15");
    const before = doses.map((d) => d.key);
    const order = quickLogOrder(doses, 16 * 60);
    expect(order).toHaveLength(doses.length);
    expect(doses.map((d) => d.key)).toEqual(before);
  });
});
