// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The persistence pipeline. `parseDoc` is the trust boundary every read
// crosses — localStorage, cloud, imported backups — so what is pinned here is
// its manners with bytes it did not write: keep everything readable, drop
// what is not, and never throw on a shape problem.

import { describe, expect, it } from "vitest";

import { normalizeDoc, parseDoc, serializeDoc } from "../src/app/migrations.ts";
import { DOC_VERSION, emptyDoc } from "../src/app/types.ts";

const MED = {
  id: "m1",
  name: "Levothyroxine",
  dose: "50 µg",
  times: ["08:00"],
  startDate: "2024-03-01",
  endDate: null,
  updatedAt: "2024-03-01T08:00:00.000Z",
};

describe("normalizeDoc", () => {
  it("returns an empty document for non-objects", () => {
    expect(normalizeDoc(null)).toEqual(emptyDoc());
    expect(normalizeDoc("nope")).toEqual(emptyDoc());
    expect(normalizeDoc([1, 2])).toEqual(emptyDoc());
  });

  it("keeps a well-formed document intact", () => {
    const doc = normalizeDoc({
      version: DOC_VERSION,
      medications: { m1: MED },
      days: {
        "2024-03-05": {
          date: "2024-03-05",
          taken: { "m1@08:00": "2024-03-05T08:05:00.000Z" },
          updatedAt: "2024-03-05T08:05:00.000Z",
        },
      },
    });
    expect(doc.medications.m1).toEqual(MED);
    expect(doc.days["2024-03-05"]?.taken["m1@08:00"]).toBe(
      "2024-03-05T08:05:00.000Z",
    );
  });

  it("lifts an unversioned document to the current version", () => {
    const doc = normalizeDoc({ medications: { m1: MED }, days: {} });
    expect(doc.version).toBe(DOC_VERSION);
    expect(doc.medications.m1).toEqual(MED);
  });

  it("drops medications that cannot mean anything", () => {
    const doc = normalizeDoc({
      version: DOC_VERSION,
      medications: {
        noName: { ...MED, id: "noName", name: "  " },
        noTimes: { ...MED, id: "noTimes", times: [] },
        badTimes: { ...MED, id: "badTimes", times: ["8am", "later"] },
        ok: { ...MED, id: "ok" },
      },
      days: {},
    });
    expect(Object.keys(doc.medications)).toEqual(["ok"]);
  });

  it("sorts and deduplicates a medication's times", () => {
    const doc = normalizeDoc({
      version: DOC_VERSION,
      medications: {
        m1: { ...MED, times: ["20:00", "08:00", "20:00", "not a time"] },
      },
      days: {},
    });
    expect(doc.medications.m1?.times).toEqual(["08:00", "20:00"]);
  });

  it("drops malformed taps and days left with none", () => {
    const doc = normalizeDoc({
      version: DOC_VERSION,
      medications: { m1: MED },
      days: {
        "2024-03-05": {
          date: "2024-03-05",
          taken: { "m1@08:00": 12345 },
          updatedAt: "x",
        },
        "2024-03-06": "not a log",
      },
    });
    expect(doc.days).toEqual({});
  });
});

describe("serializeDoc / parseDoc", () => {
  it("round-trips a document", () => {
    const doc = normalizeDoc({
      version: DOC_VERSION,
      medications: { m1: MED },
      days: {
        "2024-03-05": {
          date: "2024-03-05",
          taken: { "m1@08:00": "2024-03-05T08:05:00.000Z" },
          updatedAt: "2024-03-05T08:05:00.000Z",
        },
      },
    });
    expect(parseDoc(serializeDoc(doc))).toEqual(doc);
  });

  it("emits stable bytes regardless of insertion order", () => {
    const a = serializeDoc(
      normalizeDoc({
        version: DOC_VERSION,
        medications: { m1: MED, m2: { ...MED, id: "m2", name: "B" } },
        days: {},
      }),
    );
    const b = serializeDoc(
      normalizeDoc({
        version: DOC_VERSION,
        medications: { m2: { ...MED, id: "m2", name: "B" }, m1: MED },
        days: {},
      }),
    );
    expect(a).toBe(b);
  });

  it("throws on bytes that are not JSON", () => {
    expect(() => parseDoc("{not json")).toThrow();
  });
});
