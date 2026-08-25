// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The reconciliation rules: medications by last edit, day logs by union of
// taps. What matters most here is what the merge must NOT do — drop a tap
// that only one device holds, or let argument order decide a med's fields.

import { describe, expect, it } from "vitest";

import { mergeDocs } from "../src/app/merge.ts";
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

function docWith(partial: Partial<AppData>): AppData {
  return { ...emptyDoc(), ...partial };
}

describe("medication merge", () => {
  it("keeps the later edit of the same medication", () => {
    const local = docWith({
      medications: {
        m1: med({ dose: "50 µg", updatedAt: "2024-03-01T08:00:00.000Z" }),
      },
    });
    const remote = docWith({
      medications: {
        m1: med({ dose: "75 µg", updatedAt: "2024-03-02T08:00:00.000Z" }),
      },
    });
    expect(mergeDocs(local, remote).medications.m1?.dose).toBe("75 µg");
    expect(mergeDocs(remote, local).medications.m1?.dose).toBe("75 µg");
  });

  it("keeps medications only one side holds", () => {
    const local = docWith({ medications: { m1: med() } });
    const remote = docWith({
      medications: { m2: med({ id: "m2", name: "Metformin" }) },
    });
    const merged = mergeDocs(local, remote);
    expect(Object.keys(merged.medications).sort()).toEqual(["m1", "m2"]);
  });
});

describe("day-log merge", () => {
  const morning = doseKey("m1", "08:00");
  const evening = doseKey("m1", "20:00");

  it("unions taps from both sides", () => {
    const local = docWith({
      days: {
        "2024-03-05": {
          date: "2024-03-05",
          taken: { [morning]: "2024-03-05T08:05:00.000Z" },
          updatedAt: "2024-03-05T08:05:00.000Z",
        },
      },
    });
    const remote = docWith({
      days: {
        "2024-03-05": {
          date: "2024-03-05",
          taken: { [evening]: "2024-03-05T20:10:00.000Z" },
          updatedAt: "2024-03-05T20:10:00.000Z",
        },
      },
    });
    const merged = mergeDocs(local, remote);
    expect(Object.keys(merged.days["2024-03-05"]!.taken).sort()).toEqual(
      [morning, evening].sort(),
    );
  });

  it("keeps the earlier timestamp when both logged the same dose", () => {
    // Both devices ticked the same dose; the first tap is the one that
    // happened, the second was a re-tick of an already-synced fact.
    const local = docWith({
      days: {
        "2024-03-05": {
          date: "2024-03-05",
          taken: { [morning]: "2024-03-05T08:05:00.000Z" },
          updatedAt: "2024-03-05T08:05:00.000Z",
        },
      },
    });
    const remote = docWith({
      days: {
        "2024-03-05": {
          date: "2024-03-05",
          taken: { [morning]: "2024-03-05T09:30:00.000Z" },
          updatedAt: "2024-03-05T09:30:00.000Z",
        },
      },
    });
    expect(mergeDocs(local, remote).days["2024-03-05"]!.taken[morning]).toBe(
      "2024-03-05T08:05:00.000Z",
    );
    expect(mergeDocs(remote, local).days["2024-03-05"]!.taken[morning]).toBe(
      "2024-03-05T08:05:00.000Z",
    );
  });

  it("keeps whole days only one side holds", () => {
    const local = docWith({
      days: {
        "2024-03-05": {
          date: "2024-03-05",
          taken: { [morning]: "2024-03-05T08:05:00.000Z" },
          updatedAt: "2024-03-05T08:05:00.000Z",
        },
      },
    });
    const merged = mergeDocs(local, emptyDoc());
    expect(merged.days["2024-03-05"]).toBeDefined();
    expect(mergeDocs(emptyDoc(), local).days["2024-03-05"]).toBeDefined();
  });
});
