// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The autocomplete's ranking, pinned on a small fixture — plus a shape check
// over the real bundled catalogs, which are data a typo can quietly break —
// and the rule that picks between them.

import { describe, expect, it } from "vitest";

import {
  catalogEntryFor,
  catalogRegion,
  searchCatalog,
  type CatalogEntry,
} from "../src/app/catalog.ts";
import { MEDICATIONS } from "../src/app/data/medications.ts";
import { MEDICATIONS as MEDICATIONS_US } from "../src/app/data/medications-us.ts";

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

describe("catalogRegion", () => {
  it("gives a United States device the US catalog", () => {
    expect(catalogRegion(["en-US"])).toBe("us");
    expect(catalogRegion(["es-US", "en-US"])).toBe("us");
  });

  it('does not read a bare "en" as American', () => {
    // A language with no region says nothing about the pharmacy shelf.
    expect(catalogRegion(["en"])).toBe("se");
    expect(catalogRegion(["en", "sv"])).toBe("se");
    // It is passed over, so the first tag that names a region decides.
    expect(catalogRegion(["en", "en-US"])).toBe("us");
    expect(catalogRegion(["en", "en-GB"])).toBe("se");
  });

  it("keeps the Swedish catalog everywhere else", () => {
    expect(catalogRegion(["sv-SE"])).toBe("se");
    expect(catalogRegion(["sv"])).toBe("se");
    // English on a Swedish phone is still a Swedish pharmacy.
    expect(catalogRegion(["en-SE"])).toBe("se");
    expect(catalogRegion(["en-GB"])).toBe("se");
    expect(catalogRegion(["nb-NO"])).toBe("se");
  });

  it("is decided by the first locale the device prefers", () => {
    expect(catalogRegion(["sv-SE", "en-US"])).toBe("se");
    expect(catalogRegion(["en-US", "sv-SE"])).toBe("us");
  });

  it("falls back to the Swedish catalog with nothing to go on", () => {
    expect(catalogRegion([])).toBe("se");
    expect(catalogRegion(["not a locale!"])).toBe("se");
  });
});

// Whatever a catalog holds, it has to be something the form can offer: one
// entry per name, and strengths that read as chips.
function expectWellFormed(entries: typeof MEDICATIONS, atLeast: number) {
  const names = new Set<string>();
  for (const entry of entries) {
    expect(entry.name.trim()).not.toBe("");
    expect(names.has(entry.name.toLowerCase())).toBe(false);
    names.add(entry.name.toLowerCase());
    for (const strength of entry.strengths) {
      expect(strength.trim()).not.toBe("");
    }
  }
  expect(entries.length).toBeGreaterThan(atLeast);
}

describe("the bundled catalog", () => {
  it("has unique, non-empty names and non-empty strength strings", () => {
    expectWellFormed(MEDICATIONS, 150);
  });
});

describe("the US catalog", () => {
  it("has unique, non-empty names and non-empty strength strings", () => {
    expectWellFormed(MEDICATIONS_US, 150);
  });

  it("writes micrograms the way a US label does", () => {
    for (const entry of MEDICATIONS_US) {
      for (const strength of entry.strengths) {
        expect(strength).not.toMatch(/µg/);
      }
    }
    expect(
      catalogEntryFor(MEDICATIONS_US, "levothyroxine")?.strengths,
    ).toContain("50 mcg");
  });

  it("suggests nothing on the controlled-substance schedules", () => {
    const controlled =
      /oxycodone|hydrocodone|morphine|fentanyl|codeine|tramadol|tapentadol|methadone|buprenorphine|alprazolam|lorazepam|clonazepam|diazepam|temazepam|zolpidem|eszopiclone|amphetamine|methylphenidate|modafinil|armodafinil|pregabalin|lacosamide|carisoprodol|phenobarbital|butalbital|testosterone|phentermine|lomotil|diphenoxylate/i;
    for (const entry of MEDICATIONS_US) {
      expect(entry.name).not.toMatch(controlled);
    }
  });

  it("finds a US generic the Swedish catalog calls by another name", () => {
    expect(searchCatalog(MEDICATIONS_US, "acet")[0]?.name).toBe(
      "Acetaminophen",
    );
    expect(catalogEntryFor(MEDICATIONS_US, "Levaxin")).toBeNull();
  });
});
