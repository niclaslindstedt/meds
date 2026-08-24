// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The autocomplete's ranking, pinned on a small fixture — plus a shape check
// over the real bundled catalog, which is data a typo can quietly break.

import { describe, expect, it } from "vitest";

import {
  catalogEntryFor,
  searchCatalog,
  type CatalogEntry,
} from "../src/app/catalog.ts";
import { MEDICATIONS } from "../src/app/data/medications.ts";

const FIXTURE: CatalogEntry[] = [
  { name: "Levaxin", strengths: ["50 µg", "100 µg"] },
  { name: "Levetiracetam", strengths: ["500 mg"] },
  { name: "Elvanse", strengths: ["30 mg"] },
  { name: "Sertralin", strengths: ["50 mg"] },
];

describe("searchCatalog", () => {
  it("answers nothing for queries under two characters", () => {
    expect(searchCatalog(FIXTURE, "")).toEqual([]);
    expect(searchCatalog(FIXTURE, "l")).toEqual([]);
  });

  it("ranks prefix matches before substring matches", () => {
    const entries: CatalogEntry[] = [
      ...FIXTURE,
      { name: "Amlevatin", strengths: [] },
    ];
    // "Levaxin" and "Levetiracetam" start with the query and sort
    // alphabetically; "Amlevatin" merely contains it and comes after even
    // though it sorts first by name.
    expect(searchCatalog(entries, "lev").map((e) => e.name)).toEqual([
      "Levaxin",
      "Levetiracetam",
      "Amlevatin",
    ]);
  });

  it("matches case-insensitively and caps the list", () => {
    expect(searchCatalog(FIXTURE, "LEV")).toHaveLength(2);
    expect(searchCatalog(FIXTURE, "lev", 1)).toHaveLength(1);
  });

  it("keeps å/ä/ö distinct while ignoring accents", () => {
    const entries: CatalogEntry[] = [
      { name: "Kåvepenin", strengths: [] },
      { name: "Kavepenin fiktiv", strengths: [] },
    ];
    // "kåv" finds only the å name; "kav" only the a name — the vowels are
    // different letters, not variants.
    expect(searchCatalog(entries, "kåv").map((e) => e.name)).toEqual([
      "Kåvepenin",
    ]);
    expect(searchCatalog(entries, "kav").map((e) => e.name)).toEqual([
      "Kavepenin fiktiv",
    ]);
  });
});

describe("catalogEntryFor", () => {
  it("finds an exact name whatever the case, and nothing else", () => {
    expect(catalogEntryFor(FIXTURE, "levaxin")?.name).toBe("Levaxin");
    expect(catalogEntryFor(FIXTURE, "Levax")).toBeNull();
    expect(catalogEntryFor(FIXTURE, "")).toBeNull();
  });
});

describe("the bundled catalog", () => {
  it("has unique, non-empty names and non-empty strength strings", () => {
    const names = new Set<string>();
    for (const entry of MEDICATIONS) {
      expect(entry.name.trim()).not.toBe("");
      expect(names.has(entry.name.toLowerCase())).toBe(false);
      names.add(entry.name.toLowerCase());
      for (const strength of entry.strengths) {
        expect(strength.trim()).not.toBe("");
      }
    }
    expect(MEDICATIONS.length).toBeGreaterThan(150);
  });
});
