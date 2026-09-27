// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
// The references registry, `docs/references.json`, held to the code that
// cites it. The app makes few claims — it is a logbook — but the adherence
// figure is a published measure and the catalog is published data, and each
// cites its source with a `[ref:<id>]` tag beside it. The registry carries the
// full record: who, where, the DOI or URL, the words taken from it, and how
// strong the evidence is. OSS_SPEC.md §24 asks for the same, and
// `oss-spec validate` checks it too; this test is the one a contributor sees
// first.
//
// The rules are the framework's `auditReferences`: every tag in `src/` names
// an entry; every entry is cited somewhere; each entry's `usedBy` lists
// exactly the files that cite it; each entry carries enough to find the
// source again — plus this app's own fields, a line for the user and a tab
// to list it under. Below that, the list the About screen shows is pinned
// against the real entries.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
  auditReferences,
  byline,
  byTopic,
  evidenceRank,
  publication,
  referenceList,
  sourceLink,
  unlistedTopics,
} from "@niclaslindstedt/oss-framework/references";

import {
  SUMMARY_LANGUAGES,
  TOPICS,
  type Registry,
} from "../src/app/references.ts";

const root = join(import.meta.dirname, "..");
const registry = JSON.parse(
  readFileSync(join(root, "docs", "references.json"), "utf8"),
) as Registry;

/** Every source file under `src/`, as repo-relative path → text. */
function sources(dir = join(root, "src")): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) Object.assign(out, sources(path));
    else if (/\.(ts|tsx)$/.test(name)) {
      out[relative(root, path)] = readFileSync(path, "utf8");
    }
  }
  return out;
}

describe("the references registry", () => {
  it("agrees with the [ref:…] tags in the code, and every entry is complete", () => {
    expect(
      auditReferences(registry, sources(), {
        languages: SUMMARY_LANGUAGES,
        topics: TOPICS,
      }),
    ).toEqual([]);
  });
});

describe("the references, as the About screen lists them", () => {
  const list = referenceList(registry);

  it("lists every entry once, strongest evidence first", () => {
    expect(list.map((r) => r.id).sort()).toEqual(
      Object.keys(registry.references).sort(),
    );
    const ranks = list.map((r) => evidenceRank(r.evidence));
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    // The consensus definition leads; the register's data follows.
    expect(list[0]!.id).toBe("vrijens-2012");
    expect(list.at(-1)!.evidence).toBe("dataset");
  });

  it("groups by tab in the bar's order, with none left unlisted", () => {
    const groups = byTopic(list, TOPICS);
    expect(groups.map((g) => g.topic)).toEqual(["history", "meds"]);
    expect(groups[0]!.refs.map((r) => r.id)).toEqual(["vrijens-2012"]);
    expect(unlistedTopics(list, TOPICS)).toEqual([]);
  });

  it("cites a paper by its authors and journal, and links its DOI", () => {
    const vrijens = list.find((r) => r.id === "vrijens-2012")!;
    expect(byline(vrijens)).toBe("Vrijens B et al.");
    expect(publication(vrijens)).toBe(
      "British Journal of Clinical Pharmacology 73(5):691–705",
    );
    expect(sourceLink(vrijens)).toBe(
      "https://doi.org/10.1111/j.1365-2125.2012.04167.x",
    );
  });

  it("cites the register by its agency, and links its page", () => {
    const npl = list.find((r) => r.id === "lakemedelsverket-2026-npl")!;
    expect(byline(npl)).toBe("Läkemedelsverket");
    expect(sourceLink(npl)).toBe(npl.url);
    expect(npl.language).toBe("sv");
  });
});
